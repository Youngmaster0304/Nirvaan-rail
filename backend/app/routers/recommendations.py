"""AI recommendations — the Live Dispatch feed.

Every recommendation is derived from live rows (tasks, KPIs, plans); nothing is
written in the response builder. Decisions are persisted on the append-only
audit trail and read back on the next GET.
"""
import datetime
from typing import Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AuditLog, BlockPlan, Corridor, CorridorKPI, MaintenanceTask
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService
from app.services.planning_service import group_plans, list_plan_rows
from app.services.scoring_service import get_model_version, task_to_dict
from app.optimization.corridor_graph import CorridorGraph
from app.optimization.task_merger import TaskMerger

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])
audit_service = AuditService()

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
SCHEDULABLE = ("PENDING", "APPROVED")
MAX_PER_KIND = 2


class Recommendation(BaseModel):
    id: str = Field(description="Stable id used by the decision endpoint")
    kind: Literal["MERGE", "DEFER", "ALERT", "OPT"]
    title: str
    detail: str
    status: str = Field(description="PENDING REVIEW | ACTIVE ALERT | APPROVED | DISMISSED")
    ref: str = Field(description="Display reference, e.g. AI/NCR/MERGE/27092115")
    savings_label: str = ""
    savings_hours: float = 0.0
    issued_at: str = Field(description="HH:MM IST")
    actionable: bool = True
    source: str = Field(description="The API rows this was derived from")


class RecommendationListResponse(BaseModel):
    items: List[Recommendation]
    generated_at: str
    model_version: str = "v2.1"


class DecisionRequest(BaseModel):
    action: Literal["APPROVE", "DISMISS"]
    reason: Optional[str] = None


class DecisionResponse(BaseModel):
    id: str
    status: str
    audit_id: str
    message: str


def _ist_now() -> datetime.datetime:
    return datetime.datetime.now(IST)


def _ref(zone: str, kind: str) -> str:
    now = _ist_now()
    return f"AI/{zone}/{kind}/{now:%d%m%H%M}"


async def _decisions(db: AsyncSession) -> Dict[str, str]:
    """Latest decision per recommendation id from the audit trail."""
    rows = (await db.execute(
        select(AuditLog)
        .where(AuditLog.entity_type == "Recommendation")
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
    )).scalars().all()
    out: Dict[str, str] = {}
    for row in rows:
        if row.entity_id not in out:
            out[row.entity_id] = (
                "APPROVED" if row.action.endswith("APPROVED") else "DISMISSED"
            )
    return out


async def _merge_recs(db: AsyncSession) -> List[Recommendation]:
    tasks = list((await db.execute(
        select(MaintenanceTask)
        .where(MaintenanceTask.status.in_(SCHEDULABLE))
        .order_by(MaintenanceTask.priority_score.desc().nulls_last(), MaintenanceTask.days_overdue.desc())
        .limit(40)
    )).scalars().all())
    if not tasks:
        return []

    merger = TaskMerger(CorridorGraph())
    inputs = []
    for task in tasks:
        entry = task_to_dict(task)
        entry["id"] = task.task_id
        entry["estimated_duration_min"] = task.required_duration_min
        inputs.append(entry)

    recs: List[Recommendation] = []
    for group in merger.find_merge_candidates(inputs)[:MAX_PER_KIND]:
        members = [t for t in tasks if t.task_id in set(group.task_ids)]
        if len(members) < 2:
            continue
        first = members[0]
        duration = sum(m.required_duration_min for m in members)
        ids = ", ".join(m.task_id for m in members)
        recs.append(Recommendation(
            id=f"AI-MERGE-{len(recs) + 1}",
            kind="MERGE",
            title=f"Merge {len(members)} tasks — {first.section_id}, {first.corridor_name or first.corridor_id}",
            detail=(
                f"{ids} are compatible and can share one {duration}-minute possession window on "
                f"{first.section_id}. {group.reason}. Saves {group.savings_hours:g} h of aggregate downtime."
            ),
            status="PENDING REVIEW",
            ref=_ref((first.corridor_id or "NCR").split("-")[0], "MERGE"),
            savings_label=f"Saves {group.savings_hours:g} hrs",
            savings_hours=float(group.savings_hours),
            issued_at=f"{_ist_now():%H:%M} IST",
            source="GET /api/tasks + task merger",
        ))
    return recs


async def _defer_recs(db: AsyncSession) -> List[Recommendation]:
    task = (await db.execute(
        select(MaintenanceTask)
        .where(MaintenanceTask.status.in_(SCHEDULABLE))
        .where(MaintenanceTask.days_overdue > 0)
        .order_by(MaintenanceTask.days_overdue.desc())
        .limit(1)
    )).scalars().first()
    if not task:
        return []
    hours = round(task.required_duration_min / 60.0, 1)
    return [Recommendation(
        id="AI-DEFER-1",
        kind="DEFER",
        title=f"Defer {task.task_id} to a traffic-free window",
        detail=(
            f"{task.defect_type} at {task.section_id} is {task.days_overdue} days past its due date and still "
            f"PENDING. Moving the {task.required_duration_min}-minute possession out of the daytime roster "
            f"keeps {hours:g} h of line open for passenger traffic."
        ),
        status="PENDING REVIEW",
        ref=_ref((task.corridor_id or "NCR").split("-")[0], "DEFER"),
        savings_label=f"Saves {hours:g} hrs",
        savings_hours=hours,
        issued_at=f"{_ist_now():%H:%M} IST",
        source="GET /api/tasks?status=PENDING",
    )]


async def _alert_recs(db: AsyncSession) -> List[Recommendation]:
    latest: Dict[str, CorridorKPI] = {}
    for kpi in (await db.execute(
        select(CorridorKPI).order_by(CorridorKPI.date.desc())
    )).scalars().all():
        latest.setdefault(kpi.corridor_id, kpi)
    corridors = {c.corridor_id: c.name for c in (await db.execute(select(Corridor))).scalars().all()}

    recs: List[Recommendation] = []
    for corridor_id, kpi in latest.items():
        if (kpi.composite_score or 100) >= 60:
            continue
        critical = list((await db.execute(
            select(MaintenanceTask)
            .where(MaintenanceTask.corridor_id == corridor_id)
            .where(MaintenanceTask.defect_severity == "Critical")
            .where(MaintenanceTask.status.in_(SCHEDULABLE))
            .order_by(MaintenanceTask.days_overdue.desc())
        )).scalars().all())
        oldest = critical[0].days_overdue if critical else 0
        recs.append(Recommendation(
            id=f"AI-ALERT-{corridor_id}",
            kind="ALERT",
            title=f"ALERT: {corridors.get(corridor_id, corridor_id)} composite {kpi.composite_score:.0f}%",
            detail=(
                f"Composite score {kpi.composite_score:.0f}% is below the 60% threshold with "
                f"{len(critical)} critical defect(s) open, the oldest {oldest} days overdue "
                f"(punctuality {kpi.punctuality:.0f}%, reliability {kpi.block_reliability:.0f}%). "
                f"Field inspection by the owning department is required."
            ),
            status="ACTIVE ALERT",
            ref=_ref(corridor_id.split("-")[0], "ALERT"),
            savings_label="",
            savings_hours=0.0,
            issued_at=f"{_ist_now():%H:%M} IST",
            actionable=False,
            source="GET /api/corridors/kpis + GET /api/tasks",
        ))
        if len(recs) >= MAX_PER_KIND:
            break
    return recs


async def _opt_recs(db: AsyncSession) -> List[Recommendation]:
    plans = group_plans(await list_plan_rows(db, None))
    if not plans:
        return []
    plan_id = plans[0]["plan_id"]
    rows = list((await db.execute(
        select(BlockPlan)
        .where(BlockPlan.plan_id == plan_id)
        .order_by(BlockPlan.window_start)
    )).scalars().all())

    by_section: Dict[str, list] = {}
    for row in rows:
        by_section.setdefault(row.section_id, []).append(row)

    recs: List[Recommendation] = []
    for section_id, section_rows in sorted(by_section.items()):
        if len(section_rows) < 2:
            continue
        extra = len(section_rows) - 1
        hours = round(extra * 0.5, 1)
        ids = ", ".join(r.block_id for r in section_rows)
        recs.append(Recommendation(
            id=f"AI-OPT-{plan_id}-{section_id}",
            kind="OPT",
            title=f"Combine {len(section_rows)} blocks — {section_id} in {plan_id}",
            detail=(
                f"{ids} book {len(section_rows)} separate possessions on {section_id}. Running them as one "
                f"window removes {extra} changeover(s), about {hours:g} h of mobilisation time."
            ),
            status="PENDING REVIEW",
            ref=_ref((section_rows[0].corridor_id or "NCR").split("-")[0], "OPT"),
            savings_label=f"Saves {hours:g} hrs",
            savings_hours=hours,
            issued_at=f"{_ist_now():%H:%M} IST",
            source=f"GET /api/optimize/plans/{plan_id}",
        ))
        if len(recs) >= MAX_PER_KIND:
            break
    return recs


async def _build(db: AsyncSession) -> List[Recommendation]:
    recs = await _merge_recs(db)
    recs += await _defer_recs(db)
    recs += await _alert_recs(db)
    recs += await _opt_recs(db)
    return recs


@router.get("", response_model=RecommendationListResponse)
async def list_recommendations(
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Returns the AI recommendations derived from live tasks, KPIs and plans."""
    recs = await _build(db)
    decisions = await _decisions(db)
    for rec in recs:
        decided = decisions.get(rec.id)
        if decided and rec.status != "ACTIVE ALERT":
            rec.status = decided
    return RecommendationListResponse(
        items=recs,
        generated_at=f"{_ist_now():%H:%M:%S} IST",
        model_version=get_model_version(),
    )


@router.post("/{rec_id}/decision", response_model=DecisionResponse)
async def decide(
    rec_id: str,
    request: DecisionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user),
):
    """Approves or dismisses one recommendation (written to the audit trail)."""
    recs = await _build(db)
    match = next((r for r in recs if r.id == rec_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    action = "RECOMMENDATION_APPROVED" if request.action == "APPROVE" else "RECOMMENDATION_DISMISSED"
    audit_id = await audit_service.log_action(
        db, current_user.employee_id, current_user.name, action,
        "Recommendation", rec_id,
        {"kind": match.kind, "ref": match.ref, "title": match.title},
        reason=request.reason,
    )
    await db.commit()

    return DecisionResponse(
        id=rec_id,
        status="APPROVED" if request.action == "APPROVE" else "DISMISSED",
        audit_id=audit_id,
        message=f"{rec_id} {request.action.lower()}d · audit {audit_id}",
    )
