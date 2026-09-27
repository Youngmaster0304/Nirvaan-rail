import datetime
import logging
import math
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Optional, Sequence

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BlockPlan, Corridor, MaintenanceTask, Section
from app.ml.model_manager import get_prioritizer
from app.optimization.corridor_graph import CorridorGraph
from app.optimization.monthly_planner import MonthlyPlanner
from app.optimization.optimizer import BlockOptimizer
from app.optimization.task_merger import TaskMerger
from app.optimization.weekly_planner import WeeklyPlanner
from app.services.scoring_service import score_and_persist, task_to_dict

logger = logging.getLogger(__name__)

SLOT_MINUTES = 30
MAX_BLOCK_MINUTES = 360
SCHEDULABLE_STATUSES = ("PENDING", "APPROVED")
PLAN_LIMITS = {"WEEKLY": 60, "MONTHLY": 120}


async def load_planning_tasks(
    db: AsyncSession,
    window_end: datetime.date,
    corridor_id: Optional[str],
    limit: int,
) -> List[MaintenanceTask]:
    query = (
        select(MaintenanceTask)
        .where(MaintenanceTask.status.in_(SCHEDULABLE_STATUSES))
        .where(or_(MaintenanceTask.due_date.is_(None), MaintenanceTask.due_date <= window_end))
    )
    if corridor_id:
        query = query.where(MaintenanceTask.corridor_id == corridor_id)
    query = query.order_by(
        MaintenanceTask.priority_score.desc().nulls_last(),
        MaintenanceTask.days_overdue.desc(),
    ).limit(limit)
    return list((await db.execute(query)).scalars().all())


async def section_index(db: AsyncSession) -> Dict[str, Dict[str, Any]]:
    rows = (await db.execute(select(Section, Corridor).join(Corridor, Corridor.corridor_id == Section.corridor_id))).all()
    index: Dict[str, Dict[str, Any]] = {}
    for section, corridor in rows:
        index[section.section_id] = {
            "corridor_id": corridor.corridor_id,
            "corridor_name": corridor.name,
            "label": f"{section.from_station_name} – {section.to_station_name}",
        }
    return index


def build_jobs(tasks: Sequence[MaintenanceTask], merger: TaskMerger) -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """Uses TaskMerger to pair compatible work, then wraps leftovers as single-job blocks."""
    task_dicts = [task_to_dict(t) for t in tasks]
    by_id = {t.task_id: t for t in tasks}

    merger_inputs = []
    for task, data in zip(tasks, task_dicts):
        entry = dict(data)
        entry["id"] = task.task_id
        entry["estimated_duration_min"] = task.required_duration_min
        merger_inputs.append(entry)

    groups = merger.find_merge_candidates(merger_inputs)

    jobs: List[Dict[str, Any]] = []
    used: set[str] = set()
    merged_pairs = 0
    savings_hours = 0.0

    for group in groups:
        task_ids = list(group.task_ids)
        if any(tid in used for tid in task_ids):
            continue
        members = [by_id[tid] for tid in task_ids if tid in by_id]
        if not members:
            continue
        jobs.append(_make_job(f"J{len(jobs) + 1:03d}", members, group.reason, group.savings_hours))
        used.update(task_ids)
        merged_pairs += 1
        savings_hours += group.savings_hours

    for task in tasks:
        if task.task_id in used:
            continue
        jobs.append(_make_job(f"J{len(jobs) + 1:03d}", [task], "Scheduled individually", 0.0))

    stats = {
        "merge_candidates": len(groups),
        "merged_jobs": merged_pairs,
        "merger_savings_hours": round(savings_hours, 2),
        "jobs": len(jobs),
    }
    return jobs, stats


def _make_job(job_id: str, members: Sequence[MaintenanceTask], reason: str, savings_hours: float) -> Dict[str, Any]:
    first = members[0]
    scores = [float(m.priority_score) for m in members if m.priority_score is not None]
    return {
        "id": job_id,
        "task_ids": [m.task_id for m in members],
        "section_id": first.section_id,
        "corridor_id": first.corridor_id,
        "corridor_name": first.corridor_name,
        "departments": sorted({m.department for m in members if m.department}),
        "estimated_duration_min": min(MAX_BLOCK_MINUTES, sum(m.required_duration_min for m in members)),
        "savings_hours": savings_hours,
        "reason": reason,
        "max_score": max(scores) if scores else 0.0,
    }


def _chunk_jobs(jobs: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Greedy fallback packing: same section, cumulative duration within the 6h ceiling."""
    by_section: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for job in sorted(jobs, key=lambda j: -j["max_score"]):
        by_section[j["section_id"]].append(job)

    blocks = []
    for section_id, section_jobs in by_section.items():
        current: List[Dict[str, Any]] = []
        duration = 0
        for job in section_jobs:
            if current and duration + job["estimated_duration_min"] > MAX_BLOCK_MINUTES:
                blocks.append(_chunk_block(section_id, current))
                current, duration = [], 0
            current.append(job)
            duration += job["estimated_duration_min"]
        if current:
            blocks.append(_chunk_block(section_id, current))
    return blocks


def _chunk_block(section_id: str, jobs: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    return {
        "block_id": f"BLK_G{abs(hash((section_id, tuple(j['id'] for j in jobs))) % 100000):05d}",
        "start_slot": 0,
        "jobs": [job["id"] for job in jobs],
        "tasks": [task_id for job in jobs for task_id in job["task_ids"]],
    }


def place_blocks(
    blocks: Sequence[Dict[str, Any]],
    jobs_by_id: Dict[str, Dict[str, Any]],
    sections: Dict[str, Dict[str, Any]],
    window_start: datetime.datetime,
) -> List[Dict[str, Any]]:
    """Splits solver blocks per section and resolves any overlap on the same section."""
    busy: Dict[str, int] = defaultdict(int)
    placed: List[Dict[str, Any]] = []

    ordered = sorted(blocks, key=lambda b: (b.get("start_slot", 0), -len(b.get("jobs", []))))
    for block in ordered:
        preferred = int(block.get("start_slot", 0))
        grouped: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for job_id in block.get("jobs", []):
            job = jobs_by_id.get(job_id)
            if job:
                grouped[job["section_id"]].append(job)

        for section_id, section_jobs in grouped.items():
            duration_min = min(MAX_BLOCK_MINUTES, sum(j["estimated_duration_min"] for j in section_jobs))
            slots = max(1, math.ceil(duration_min / SLOT_MINUTES))
            start_slot = max(preferred, busy[section_id])
            busy[section_id] = start_slot + slots

            scores = [j["max_score"] for j in section_jobs]
            meta = sections.get(section_id, {})
            task_ids = [tid for job in section_jobs for tid in job["task_ids"]]
            departments = sorted({d for job in section_jobs for d in job["departments"]})
            start = window_start + datetime.timedelta(minutes=start_slot * SLOT_MINUTES)
            end = window_start + datetime.timedelta(minutes=(start_slot + slots) * SLOT_MINUTES)

            placed.append({
                "section_id": section_id,
                "corridor_id": meta.get("corridor_id") or section_jobs[0]["corridor_id"],
                "corridor_name": meta.get("corridor_name") or section_jobs[0]["corridor_name"],
                "section_label": meta.get("label", section_id),
                "window_start": start,
                "window_end": end,
                "duration_min": duration_min,
                "departments": departments,
                "task_ids": task_ids,
                "impact_score": round(sum(scores) / len(scores), 2) if scores else 0.0,
                "jobs": [job["id"] for job in section_jobs],
                "reason": "; ".join(sorted({job["reason"] for job in section_jobs})),
            })

    placed.sort(key=lambda b: (b["window_start"], b["section_id"]))
    return placed


async def _next_plan_id(db: AsyncSession, prefix: str) -> str:
    candidate = prefix
    suffix = 1
    while True:
        existing = (
            await db.execute(select(func.count()).select_from(BlockPlan).where(BlockPlan.plan_id == candidate))
        ).scalar_one()
        if not existing:
            return candidate
        suffix += 1
        candidate = f"{prefix}-R{suffix}"


def _window(placed: Sequence[Dict[str, Any]], fallback_start: datetime.datetime, days: int) -> Dict[str, Any]:
    if placed:
        start = min(b["window_start"] for b in placed)
        end = max(b["window_end"] for b in placed)
    else:
        start = fallback_start
        end = fallback_start + datetime.timedelta(days=days)
    return {"start": start, "end": end, "days": days}


def _estimated_impact(placed: Sequence[Dict[str, Any]], unscheduled_tasks: int, degraded: bool) -> str:
    total_tasks = sum(len(b["task_ids"]) for b in placed)
    merged = sum(len(b["task_ids"]) for b in placed if len(b["task_ids"]) > 1)
    saved_hours = 0.2 * sum(
        b["duration_min"] for b in placed if len(b["task_ids"]) > 1
    ) / 60.0
    text = (
        f"{total_tasks} tasks in {len(placed)} blocks ({merged} merged) · "
        f"~{saved_hours:.1f} h downtime saved"
    )
    if unscheduled_tasks:
        text += f" · {unscheduled_tasks} jobs deferred"
    if degraded:
        text += " · solver hit the 30s cap, partial plan returned"
    return text


def _block_summary(plan_id: str, index: int, block: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "block_id": f"{plan_id}-B{index:02d}",
        "section": block["section_label"],
        "window": f"{block['window_start']:%Y-%m-%d %H:%M} – {block['window_end']:%H:%M}",
        "departments": block["departments"],
        "task_count": len(block["task_ids"]),
        "status": "DRAFT",
        "corridor_id": block["corridor_id"],
        "corridor_name": block["corridor_name"],
        "start_time": block["window_start"],
        "end_time": block["window_end"],
        "task_ids": block["task_ids"],
        "impact_score": block["impact_score"],
    }


async def generate_plan(
    db: AsyncSession,
    plan_type: str,
    start_date: datetime.date,
    horizon_days: int,
    corridor_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Runs merger + OR-Tools planner and persists the resulting BlockPlan rows."""
    window_start = datetime.datetime.combine(start_date, datetime.time(0, 0))
    window_end_date = start_date + datetime.timedelta(days=horizon_days)
    limit = PLAN_LIMITS.get(plan_type, 60)

    tasks = await load_planning_tasks(db, window_end_date, corridor_id, limit)
    await score_and_persist(db, tasks, force=False)

    graph = CorridorGraph()
    merger = TaskMerger(graph)
    optimizer = BlockOptimizer(graph, merger)
    jobs, merge_stats = build_jobs(tasks, merger)
    jobs_by_id = {job["id"]: job for job in jobs}

    degraded = False
    if jobs:
        if plan_type == "MONTHLY":
            planner = MonthlyPlanner(optimizer, get_prioritizer(), graph)
            result = planner.generate_plan(corridor_id, start_date.month, start_date.year, jobs, horizon_days, [])
        else:
            planner = WeeklyPlanner(optimizer, get_prioritizer(), graph)
            iso = start_date.isocalendar()
            result = planner.generate_plan(corridor_id, iso[1], iso[0], jobs, horizon_days, [])
        solver_blocks = result.blocks
        stats = dict(result.stats)
    else:
        solver_blocks, stats = [], {"status": "NO_JOBS"}

    if jobs and not solver_blocks:
        degraded = True
        solver_blocks = _chunk_jobs(jobs)
        stats = dict(stats)
        stats["status"] = stats.get("status", "UNKNOWN")
        logger.warning("CP-SAT returned no blocks, falling back to greedy packing")

    sections = await section_index(db)
    placed = place_blocks(solver_blocks, jobs_by_id, sections, window_start)

    unscheduled_job_ids = set(stats.get("unscheduled_tasks") or [])
    unscheduled_tasks = sum(len(jobs_by_id[j]["task_ids"]) for j in unscheduled_job_ids if j in jobs_by_id)

    plan_id = await _next_plan_id(db, prefix=_plan_prefix(plan_type, start_date))
    iso = start_date.isocalendar()

    rows: List[BlockPlan] = []
    scheduled_task_ids: set[str] = set()
    for index, block in enumerate(placed, start=1):
        block_id = f"{plan_id}-B{index:02d}"
        rows.append(BlockPlan(
            plan_id=plan_id,
            block_id=block_id,
            section_id=block["section_id"],
            corridor_id=block["corridor_id"],
            corridor_name=block["corridor_name"],
            window_start=block["window_start"],
            window_end=block["window_end"],
            departments=block["departments"],
            merged_task_ids=block["task_ids"],
            plan_type=plan_type,
            plan_week=iso[1],
            plan_year=iso[0],
            impact_score=block["impact_score"],
            trains_affected=_trains_affected(block),
            avg_delay_minutes=_avg_delay(block),
            status="DRAFT",
            explanation=(
                f"{block['reason']} · {len(block['task_ids'])} task(s), "
                f"{block['duration_min']} min possession on {block['section_label']}"
            ),
        ))
        scheduled_task_ids.update(block["task_ids"])

    db.add_all(rows)
    tasks_by_id = {t.task_id: t for t in tasks}
    for index, block in enumerate(placed, start=1):
        for task_id in block["task_ids"]:
            task = tasks_by_id.get(task_id)
            if task is not None:
                task.assigned_block_id = f"{plan_id}-B{index:02d}"
    await db.commit()

    window = _window(placed, window_start, horizon_days)
    return {
        "plan_id": plan_id,
        "plan_type": plan_type,
        "blocks": [_block_summary(plan_id, i, b) for i, b in enumerate(placed, start=1)],
        "total_blocks": len(placed),
        "total_tasks_scheduled": len(scheduled_task_ids),
        "estimated_impact": _estimated_impact(placed, unscheduled_tasks, degraded),
        "window": window,
        "degraded": degraded,
        "solver": stats,
        "merger": merge_stats,
        "corridor_id": corridor_id,
    }


def _plan_prefix(plan_type: str, start_date: datetime.date) -> str:
    if plan_type == "MONTHLY":
        return f"MONTH-{start_date.year}-{start_date.month:02d}"
    iso = start_date.isocalendar()
    return f"WEEK-{iso[0]}-W{iso[1]:02d}"


def _trains_affected(block: Dict[str, Any]) -> int:
    density = 100
    return max(1, math.ceil(block["duration_min"] / 60 * (1 + density / 100)))


def _avg_delay(block: Dict[str, Any]) -> float:
    return round(4.0 + block["duration_min"] / 30.0, 1)


def rows_to_summaries(plan_id: str, rows: Sequence[BlockPlan]) -> List[Dict[str, Any]]:
    summaries = []
    for index, row in enumerate(rows, start=1):
        summaries.append({
            "block_id": row.block_id,
            "section": row.section_id,
            "window": f"{row.window_start:%Y-%m-%d %H:%M} – {row.window_end:%H:%M}",
            "departments": list(row.departments or []),
            "task_count": len(row.merged_task_ids or []),
            "status": row.status,
            "corridor_id": row.corridor_id,
            "corridor_name": row.corridor_name,
            "start_time": row.window_start,
            "end_time": row.window_end,
            "task_ids": list(row.merged_task_ids or []),
            "impact_score": row.impact_score or 0.0,
        })
    return summaries


def plan_status(rows: Sequence[BlockPlan]) -> str:
    statuses = {row.status for row in rows}
    if "APPROVED" in statuses:
        return "APPROVED"
    if "REJECTED" in statuses:
        return "REJECTED"
    return "DRAFT"


def plan_impact(rows: Sequence[BlockPlan]) -> str:
    tasks = sum(len(row.merged_task_ids or []) for row in rows)
    merged = sum(len(row.merged_task_ids or []) for row in rows if len(row.merged_task_ids or []) > 1)
    saved = 0.2 * sum(
        (row.window_end - row.window_start).total_seconds() / 60.0
        for row in rows if len(row.merged_task_ids or []) > 1
    ) / 60.0
    return f"{tasks} tasks in {len(rows)} blocks ({merged} merged) · ~{saved:.1f} h downtime saved"


async def plan_rows(db: AsyncSession, plan_id: str) -> List[BlockPlan]:
    result = await db.execute(
        select(BlockPlan).where(BlockPlan.plan_id == plan_id).order_by(BlockPlan.window_start)
    )
    return list(result.scalars().all())


async def list_plan_rows(
    db: AsyncSession,
    horizon: Optional[str] = None,
    corridor_id: Optional[str] = None,
    status: Optional[str] = None,
) -> List[BlockPlan]:
    query = select(BlockPlan)
    if horizon:
        query = query.where(BlockPlan.plan_type == horizon.upper())
    if corridor_id:
        query = query.where(BlockPlan.corridor_id == corridor_id)
    if status:
        query = query.where(func.upper(BlockPlan.status) == status.upper())
    query = query.order_by(BlockPlan.created_at.desc(), BlockPlan.window_start)
    return list((await db.execute(query)).scalars().all())


def group_plans(rows: Sequence[BlockPlan]) -> List[Dict[str, Any]]:
    grouped: Dict[str, List[BlockPlan]] = defaultdict(list)
    for row in rows:
        grouped[row.plan_id or row.block_id].append(row)

    plans = []
    for plan_id, plan_rows_ in grouped.items():
        plan_rows_.sort(key=lambda r: r.window_start)
        start = min(r.window_start for r in plan_rows_)
        end = max(r.window_end for r in plan_rows_)
        plans.append({
            "plan_id": plan_id,
            "plan_type": plan_rows_[0].plan_type,
            "window": {
                "start": start,
                "end": end,
                "days": max(1, (end.date() - start.date()).days + 1),
            },
            "total_blocks": len(plan_rows_),
            "total_tasks_scheduled": sum(len(r.merged_task_ids or []) for r in plan_rows_),
            "estimated_impact": plan_impact(plan_rows_),
            "status": plan_status(plan_rows_),
            "created_at": min(r.created_at for r in plan_rows_),
            "corridor_id": plan_rows_[0].corridor_id,
        })
    plans.sort(key=lambda p: p["created_at"], reverse=True)
    return plans
