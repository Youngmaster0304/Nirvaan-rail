import asyncio
import json
import logging
import os
import re
from collections import OrderedDict
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

import httpx
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import BlockPlan, CorridorKPI, Corridor, MaintenanceTask, User
from app.ml.policy_layer import PolicyLayer
from app.schemas import ChatMessage, ChatResponse, SuggestedPrompts
from app.routers.auth import UserInfo
from app.services.scoring_service import get_model_version

logger = logging.getLogger(__name__)

SUGGESTED_PROMPTS = [
    "How many pending and overdue tasks are there?",
    "What are the top priority tasks I should schedule first?",
    "What is the status of the latest weekly plan?",
    "How are the corridors performing today?",
    "Why did a rail fracture task get a score of 100?",
    "Who am I signed in as?",
]

MEMORY: "OrderedDict[str, List[Dict[str, str]]]" = OrderedDict()
MEMORY_LIMIT = 20
MEMORY_SESSIONS = 100


def suggested_prompts() -> SuggestedPrompts:
    return SuggestedPrompts(prompts=list(SUGGESTED_PROMPTS), items=list(SUGGESTED_PROMPTS))


def _remember(key: str, role: str, content: str) -> None:
    turns = MEMORY.setdefault(key, [])
    turns.append({"role": role, "content": content})
    if len(turns) > MEMORY_LIMIT:
        del turns[: len(turns) - MEMORY_LIMIT]
    MEMORY.move_to_end(key)
    while len(MEMORY) > MEMORY_SESSIONS:
        MEMORY.popitem(last=False)


async def gather_facts(
    db: AsyncSession,
    user: Optional[UserInfo],
    include_top: int = 5,
    plan_type: Optional[str] = None,
) -> Dict[str, Any]:
    counts = {
        "total": int((await db.execute(select(func.count()).select_from(MaintenanceTask))).scalar_one()),
        "pending": int((await db.execute(
            select(func.count()).where(MaintenanceTask.status == "PENDING")
        )).scalar_one()),
        "overdue": int((await db.execute(
            select(func.count()).where(MaintenanceTask.days_overdue > 0)
        )).scalar_one()),
        "critical": int((await db.execute(
            select(func.count()).where(MaintenanceTask.defect_severity == "Critical")
        )).scalar_one()),
    }
    by_department = {
        dept: int(count)
        for dept, count in (await db.execute(
            select(MaintenanceTask.department, func.count()).group_by(MaintenanceTask.department)
        )).all()
    }

    top_rows = list((await db.execute(
        select(MaintenanceTask)
        .where(MaintenanceTask.priority_score.is_not(None))
        .order_by(MaintenanceTask.priority_score.desc())
        .limit(include_top)
    )).scalars().all())

    plan_query = select(BlockPlan).order_by(BlockPlan.created_at.desc(), BlockPlan.window_start).limit(200)
    if plan_type:
        plan_query = plan_query.where(BlockPlan.plan_type == plan_type.upper())
    plan_rows = list((await db.execute(plan_query)).scalars().all())

    latest_plan: Optional[Dict[str, Any]] = None
    if plan_rows:
        plan_id = plan_rows[0].plan_id
        rows = [r for r in plan_rows if r.plan_id == plan_id]
        latest_plan = {
            "plan_id": plan_id,
            "plan_type": rows[0].plan_type,
            "status": _plan_status(rows),
            "blocks": len(rows),
            "tasks_scheduled": sum(len(r.merged_task_ids or []) for r in rows),
            "window_start": min(r.window_start for r in rows).isoformat(),
            "window_end": max(r.window_end for r in rows).isoformat(),
            "corridors": sorted({r.corridor_id for r in rows}),
        }

    corridors = {c.corridor_id: c.name for c in (await db.execute(select(Corridor))).scalars().all()}
    kpis: Dict[str, CorridorKPI] = {}
    for kpi in (await db.execute(select(CorridorKPI).order_by(CorridorKPI.date.desc()))).scalars().all():
        kpis.setdefault(kpi.corridor_id, kpi)

    return {
        "counts": counts,
        "by_department": by_department,
        "top_tasks": [
            {
                "task_id": t.task_id,
                "defect_type": t.defect_type,
                "severity": t.defect_severity,
                "department": t.department,
                "corridor": t.corridor_name,
                "section_id": t.section_id,
                "days_overdue": t.days_overdue,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "priority_score": t.priority_score,
                "status": t.status,
            }
            for t in top_rows
        ],
        "latest_plan": latest_plan,
        "corridor_kpis": [
            {
                "corridor_id": kpi.corridor_id,
                "name": corridors.get(kpi.corridor_id, kpi.corridor_id),
                "punctuality": kpi.punctuality_pct,
                "block_reliability": kpi.block_reliability_pct,
                "block_productivity": kpi.block_productivity_pct,
                "composite_score": kpi.composite_score,
                "date": kpi.date.isoformat(),
            }
            for kpi in kpis.values()
        ],
        "user": user.model_dump() if user else None,
        "model_version": get_model_version(),
    }


def _plan_status(rows) -> str:
    statuses = {r.status for r in rows}
    if "APPROVED" in statuses:
        return "APPROVED"
    if "REJECTED" in statuses:
        return "REJECTED"
    return "DRAFT"


def _rules_payload() -> List[Dict[str, Any]]:
    return [
        {
            "name": rule["name"],
            "reason": rule["reason"],
            "score": rule.get("override_score", rule.get("min_score")),
            "type": "override" if "override_score" in rule else "minimum",
        }
        for rule in PolicyLayer.SAFETY_RULES
    ]


def match_intent(message: str) -> str:
    text = message.lower().strip()
    if re.search(r"\b(hi|hello|hey|namaste|greetings)\b", text) and len(text) < 30:
        return "greeting"
    if re.search(r"\b(help|what can you do|capabilities|commands|how do you work)\b", text):
        return "help"
    if re.search(r"\b(who am i|my profile|which user|my role|signed in)\b", text):
        return "whoami"
    if re.search(r"\b(safety rules?|policy rules?|rail fracture|why .*(score|100|override)|policy override|how is the score)\b", text):
        return "safety"
    if re.search(r"\b(top priority|priority task|schedule first|most urgent|highest score|what should i (schedule|fix|do first))\b", text):
        return "top"
    if re.search(r"\b(how many|count of|number of|pending|overdue|critical task)\b", text):
        return "counts"
    if re.search(r"\b(latest plan|weekly plan|monthly plan|plan status|block plan|schedule status|plan)\b", text):
        return "plan"
    if re.search(r"\b(corridors?|kpis?|health|punctuality|reliability|productivity|performing)\b", text):
        return "corridor"
    if re.search(r"\b(good morning|good afternoon|good evening|thanks|thank you)\b", text):
        return "courtesy"
    return "fallback"


def requested_plan_type(message: str) -> Optional[str]:
    text = message.lower()
    if re.search(r"\bweekly\b|\bweek\b|w\d{1,2}\b", text):
        return "WEEKLY"
    if re.search(r"\bmonthly\b|\bmonth\b", text):
        return "MONTHLY"
    return None


def rule_answer(intent: str, facts: Dict[str, Any], user: Optional[UserInfo]) -> Tuple[str, str, Optional[Dict[str, Any]]]:
    counts = facts["counts"]

    if intent == "greeting":
        return (
            "Namaste! I am the A-ABPS planning assistant. I can report task counts, list top priority "
            "tasks, check plan status, show corridor KPIs and explain the safety policy rules. "
            "Try one of the suggested prompts.",
            "rules", {"suggestions": SUGGESTED_PROMPTS},
        )

    if intent == "help":
        return (
            "I answer from the live A-ABPS database:\n"
            f"- Task counts (pending, overdue, critical) — currently {counts['pending']} pending, "
            f"{counts['overdue']} overdue, {counts['critical']} critical.\n"
            "- Top priority tasks ranked by model "
            f"{facts['model_version']}.\n"
            "- Weekly / monthly block plan status and blocks.\n"
            "- Corridor KPI snapshot (punctuality, reliability, productivity).\n"
            "- Safety policy rules (rail fracture, critical severity, interlocking fault).",
            "rules", {"suggestions": SUGGESTED_PROMPTS},
        )

    if intent == "whoami":
        if not user:
            return (
                "I cannot see a signed-in user. Send your bearer token with this request and I will "
                "tell you your employee ID, role, department and zone.",
                "rules", None,
            )
        return (
            f"You are {user.name} ({user.employee_id}), {user.role} in {user.department}, "
            f"{user.zone}{', ' + user.division if user.division else ''}.",
            "db", {"user": user.model_dump()},
        )

    if intent == "safety":
        rules = _rules_payload()
        return (
            "Safety policy overrides supersede the LightGBM score. Current rules in force:\n"
            + "\n".join(f"- {r['name']} ({r['type']} {r['score']}): {r['reason']}" for r in rules)
            + "\nA rail fracture is always pushed to 100 because Railway Board guidelines treat it as an "
              "absolute safety priority.",
            "rules", {"rules": rules},
        )

    if intent == "top":
        tasks = facts["top_tasks"]
        if not tasks:
            return (
                "No scored tasks yet — run the prioritisation step first.",
                "db", {"tasks": []},
            )
        lines = [
            f"{i}. {t['task_id']} · {t['defect_type']} ({t['severity']}) · {t['corridor']} · "
            f"score {t['priority_score']:.1f}"
            for i, t in enumerate(tasks, start=1)
        ]
        return (
            f"Top {len(tasks)} tasks by priority score:\n" + "\n".join(lines),
            "db", {"tasks": tasks},
        )

    if intent == "counts":
        payload = {
            "pending": counts["pending"],
            "overdue": counts["overdue"],
            "critical": counts["critical"],
            "total": counts["total"],
            "by_department": facts["by_department"],
        }
        return (
            f"Out of {counts['total']} tasks: {counts['pending']} pending, {counts['overdue']} overdue "
            f"and {counts['critical']} critical. By department: "
            + ", ".join(f"{k} {v}" for k, v in facts["by_department"].items())
            + ".",
            "db", payload,
        )

    if intent == "plan":
        plan = facts["latest_plan"]
        if not plan:
            return ("No block plan has been generated yet. Run the weekly or monthly planner first.", "db", None)
        return (
            f"Plan {plan['plan_id']} ({plan['plan_type']}) is {plan['status']} with {plan['blocks']} blocks "
            f"covering {plan['tasks_scheduled']} tasks from {plan['window_start'][:16]} to "
            f"{plan['window_end'][:16]} across {len(plan['corridors'])} corridors.",
            "db", {"plan": plan},
        )

    if intent == "corridor":
        kpis = facts["corridor_kpis"]
        if not kpis:
            return ("No corridor KPI rows are loaded yet.", "db", None)
        lines = [
            f"{k['name']} — punctuality {k['punctuality']}%, reliability {k['block_reliability']}%, "
            f"composite {k['composite_score']}"
            for k in kpis
        ]
        return ("Latest corridor KPIs:\n" + "\n".join(lines), "db", {"items": kpis})

    if intent == "courtesy":
        return ("You're welcome. Ask me about tasks, plans, corridors or the safety rules.", "rules", None)

    return (
        "I could not match that to a known intent. Try one of these:\n"
        + "\n".join(f"- {p}" for p in SUGGESTED_PROMPTS),
        "rules", {"suggestions": SUGGESTED_PROMPTS},
    )


async def _llm_reply(message: str, history: List[ChatMessage], facts: Dict[str, Any]) -> Optional[str]:
    openai_key = (settings.OPENAI_API_KEY or os.getenv("OPENAI_API_KEY", "")).strip()
    gemini_key = (settings.GEMINI_API_KEY or os.getenv("GEMINI_API_KEY", "")).strip()
    if not openai_key and not gemini_key:
        return None

    system = (
        "You are the A-ABPS assistant for Indian Railways block planning. Answer ONLY from the verified "
        "facts below; if the facts do not cover the question, say so and list what you can answer. "
        "Never invent task IDs, scores or plan IDs. Keep the answer under 120 words.\n\n"
        + json.dumps(facts, default=str)
    )

    turns = [{"role": m.role, "content": m.content} for m in history[-6:] if m.role in ("user", "assistant")]
    turns.append({"role": "user", "content": message})

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            if openai_key:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {openai_key}"},
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [{"role": "system", "content": system}] + turns,
                        "max_tokens": 400,
                        "temperature": 0.2,
                    },
                )
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return content.strip() or None

            contents = [
                {"role": "model" if t["role"] == "assistant" else "user", "parts": [{"text": t["content"]}]}
                for t in turns
            ]
            response = await client.post(
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
                params={"key": gemini_key},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": contents,
                    "generationConfig": {"maxOutputTokens": 400, "temperature": 0.2},
                },
            )
            response.raise_for_status()
            content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return content.strip() or None
    except Exception as exc:
        logger.warning("LLM answer unavailable (%s); falling back to rule answer", exc)
        return None


async def answer(
    db: AsyncSession,
    message: str,
    history: Optional[List[ChatMessage]] = None,
    user: Optional[UserInfo] = None,
    session_id: Optional[str] = None,
) -> ChatResponse:
    history = history or []
    key = session_id or (user.employee_id if user else "anon")
    _remember(key, "user", message)

    intent = match_intent(message)
    plan_type = requested_plan_type(message) if intent == "plan" else None
    facts = await gather_facts(db, user, plan_type=plan_type)
    reply, source, data = rule_answer(intent, facts, user)
    if intent == "plan" and plan_type and not facts.get("latest_plan"):
        reply = (
            f"No {plan_type.lower()} block plan has been generated yet. "
            "Run the weekly or monthly planner from Block Programme first."
        )
        source, data = "db", None

    if (settings.OPENAI_API_KEY or settings.GEMINI_API_KEY
            or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")):
        llm_text = await _llm_reply(message, history, facts)
        if llm_text:
            reply, source = llm_text, "llm"

    _remember(key, "assistant", reply)
    return ChatResponse(reply=reply, source=source, data=data)
