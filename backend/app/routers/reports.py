from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Any, Dict, List, Optional
from collections import OrderedDict
import csv
import datetime
import io
import uuid

from app.database import get_db
from app.models import AuditLog, BlockPlan, CorridorKPI, MaintenanceTask
from app.schemas import ReportRequest, ReportResponse
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/reports", tags=["Reports"])
audit_service = AuditService()

VALID_TYPES = ["productivity", "utilization", "health", "overdue", "accuracy"]
_REPORT_CACHE: "OrderedDict[str, Dict[str, Any]]" = OrderedDict()
_REPORT_CACHE_LIMIT = 50


async def _task_stats(db: AsyncSession) -> Dict[str, int]:
    rows = (await db.execute(
        select(MaintenanceTask.status, func.count()).group_by(MaintenanceTask.status)
    )).all()
    stats = {"total": 0}
    for status, count in rows:
        stats[str(status).lower()] = count
        stats["total"] += count
    overdue = (await db.execute(
        select(func.count()).where(MaintenanceTask.days_overdue > 0)
    )).scalar_one()
    critical = (await db.execute(
        select(func.count()).where(MaintenanceTask.defect_severity == "Critical")
    )).scalar_one()
    stats["overdue"] = int(overdue)
    stats["critical"] = int(critical)
    return stats


async def _block_stats(db: AsyncSession) -> Dict[str, Any]:
    rows = list((await db.execute(select(BlockPlan))).scalars().all())
    status_counts: Dict[str, int] = {}
    possession_hours = 0.0
    for row in rows:
        status_counts[row.status] = status_counts.get(row.status, 0) + 1
        possession_hours += (row.window_end - row.window_start).total_seconds() / 3600.0
    return {"blocks": len(rows), "by_status": status_counts, "possession_hours": round(possession_hours, 1)}


async def _kpi_rows(db: AsyncSession) -> List[Dict[str, Any]]:
    kpis = list((await db.execute(
        select(CorridorKPI).order_by(CorridorKPI.date.desc())
    )).scalars().all())
    latest: Dict[str, CorridorKPI] = {}
    for kpi in kpis:
        latest.setdefault(kpi.corridor_id, kpi)
    return [
        {
            "corridor_id": kpi.corridor_id,
            "date": kpi.date.isoformat(),
            "punctuality_pct": kpi.punctuality_pct,
            "block_reliability_pct": kpi.block_reliability_pct,
            "block_productivity_pct": kpi.block_productivity_pct,
            "composite_score": kpi.composite_score,
        }
        for kpi in latest.values()
    ]


async def _build_report(db: AsyncSession, report_type: str) -> Dict[str, Any]:
    tasks = await _task_stats(db)
    blocks = await _block_stats(db)
    kpis = await _kpi_rows(db)

    if report_type == "overdue":
        rows = [
            {
                "task_id": t.task_id,
                "department": t.department,
                "defect_type": t.defect_type,
                "severity": t.defect_severity,
                "days_overdue": t.days_overdue,
                "corridor": t.corridor_name,
                "priority_score": t.priority_score,
            }
            for t in (await db.execute(
                select(MaintenanceTask)
                .where(MaintenanceTask.days_overdue > 0)
                .order_by(MaintenanceTask.days_overdue.desc())
                .limit(100)
            )).scalars().all()
        ]
        metrics = {"overdue_tasks": len(rows), "critical_tasks": tasks.get("critical", 0)}
    elif report_type == "health":
        rows = kpis
        avg = round(sum(k["punctuality_pct"] for k in kpis) / len(kpis), 2) if kpis else 0.0
        metrics = {"avg_punctuality_pct": avg, "corridors": len(kpis)}
    elif report_type == "utilization":
        rows = [
            {
                "plan_id": b.plan_id,
                "block_id": b.block_id,
                "corridor": b.corridor_name,
                "section": b.section_id,
                "status": b.status,
                "hours": round((b.window_end - b.window_start).total_seconds() / 3600.0, 2),
                "tasks": len(b.merged_task_ids or []),
            }
            for b in (await db.execute(select(BlockPlan).order_by(BlockPlan.window_start))).scalars().all()
        ]
        metrics = {"blocks": len(rows), "possession_hours": blocks["possession_hours"]}
    elif report_type == "productivity":
        rows = []
        for department, count in (await db.execute(
            select(MaintenanceTask.department, func.count()).group_by(MaintenanceTask.department)
        )).all():
            rows.append({"department": department, "tasks": count})
        metrics = {
            "total_tasks": tasks.get("total", 0),
            "pending_tasks": tasks.get("pending", 0),
            "blocks_planned": blocks["blocks"],
            "possession_hours": blocks["possession_hours"],
        }
    else:  # accuracy
        scored = (await db.execute(
            select(func.count()).where(MaintenanceTask.priority_score.is_not(None))
        )).scalar_one()
        with_policy = (await db.execute(
            select(func.count()).where(MaintenanceTask.policy_rules.is_not(None))
        )).scalar_one()
        rows = [
            {
                "corridor_id": k["corridor_id"],
                "punctuality_pct": k["punctuality_pct"],
                "composite_score": k["composite_score"],
            }
            for k in kpis
        ]
        metrics = {
            "scored_tasks": int(scored),
            "policy_overridden_tasks": int(with_policy),
            "model_version": "v2.1",
        }

    return {
        "metrics": metrics,
        "rows": rows,
        "generated_at": datetime.datetime.utcnow().isoformat(),
        "source": "A-ABPS local database",
    }


def _summary(report_type: str, report: Dict[str, Any]) -> str:
    metrics = report["metrics"]
    if report_type == "overdue":
        return f"{metrics['overdue_tasks']} overdue tasks across corridors ({metrics['critical_tasks']} critical)."
    if report_type == "health":
        return f"{metrics['corridors']} corridors monitored, average punctuality {metrics['avg_punctuality_pct']}%."
    if report_type == "utilization":
        return f"{metrics['blocks']} blocks planned with {metrics['possession_hours']} h of possession time."
    if report_type == "productivity":
        return (
            f"{metrics['total_tasks']} tasks tracked, {metrics['pending_tasks']} pending, "
            f"{metrics['blocks_planned']} blocks planned covering {metrics['possession_hours']} h."
        )
    return (
        f"{metrics['scored_tasks']} tasks scored by model {metrics['model_version']}, "
        f"{metrics['policy_overridden_tasks']} lifted by safety policy overrides."
    )


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Generates a report from live database data."""
    if request.type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Must be one of {VALID_TYPES}")

    report = await _build_report(db, request.type)
    report_id = f"RPT-{datetime.datetime.utcnow():%Y%m%d}-{uuid.uuid4().hex[:6].upper()}"
    _REPORT_CACHE[report_id] = report
    while len(_REPORT_CACHE) > _REPORT_CACHE_LIMIT:
        _REPORT_CACHE.popitem(last=False)

    await audit_service.log_action(
        db, current_user.employee_id, current_user.name, "GENERATE_REPORT", "Report", report_id,
        {"type": request.type, "plan_id": request.plan_id},
    )

    return ReportResponse(
        report_id=report_id,
        report_type=request.type,
        summary=_summary(request.type, report),
        download_url=f"/api/reports/{report_id}/download",
        generated_at=datetime.datetime.utcnow(),
        data=report,
    )


@router.get("/{report_id}/download")
async def download_report(report_id: str):
    """Downloads a previously generated report as CSV."""
    report = _REPORT_CACHE.get(report_id)
    if report is None:
        raise HTTPException(status_code=404, detail="Report not found or expired")

    rows = report.get("rows") or []
    buffer = io.StringIO()
    if rows:
        writer = csv.DictWriter(buffer, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)
    else:
        for key, value in report.get("metrics", {}).items():
            buffer.write(f"{key},{value}\n")

    return Response(
        content=buffer.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{report_id}.csv"'},
    )
