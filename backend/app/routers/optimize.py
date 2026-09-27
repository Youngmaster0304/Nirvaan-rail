from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
import datetime

from app.database import get_db
from app.schemas import (
    WeeklyPlanRequest,
    WeeklyPlanResponse,
    MonthlyPlanRequest,
    MonthlyPlanResponse,
    PlanDetailResponse,
    PlanListResponse,
    PlanWindow,
)
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService
from app.services import planning_service

router = APIRouter(prefix="/api/optimize", tags=["Optimization"])
audit_service = AuditService()


def _start_date(request) -> datetime.date:
    if request.start_date:
        return request.start_date
    if request.week_number and request.year:
        try:
            return datetime.date.fromisocalendar(request.year, request.week_number, 1)
        except ValueError:
            pass
    return datetime.date.today()


def _window(response_window) -> PlanWindow:
    return PlanWindow(**response_window)


@router.post("/weekly", response_model=WeeklyPlanResponse)
async def generate_weekly_plan(
    request: WeeklyPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Runs weekly planner (merge -> OR-Tools CP-SAT -> persist BlockPlan rows)."""
    start = _start_date(request)
    horizon = request.horizon_days or 7
    plan = await planning_service.generate_plan(db, "WEEKLY", start, horizon, request.corridor_id)

    await audit_service.log_action(
        db, current_user.employee_id, current_user.name, "GENERATE_WEEKLY_PLAN", "Plan", plan["plan_id"],
        {"start_date": start.isoformat(), "horizon_days": horizon, "blocks": plan["total_blocks"]},
    )

    return WeeklyPlanResponse(
        plan_id=plan["plan_id"],
        blocks=plan["blocks"],
        total_blocks=plan["total_blocks"],
        total_tasks_scheduled=plan["total_tasks_scheduled"],
        estimated_impact=plan["estimated_impact"],
        window=_window(plan["window"]),
        degraded=plan["degraded"],
    )


@router.post("/monthly", response_model=MonthlyPlanResponse)
async def generate_monthly_plan(
    request: MonthlyPlanRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Runs monthly planner (merge -> OR-Tools CP-SAT -> persist BlockPlan rows)."""
    start = _start_date(request)
    horizon = request.horizon_days or 30
    plan = await planning_service.generate_plan(db, "MONTHLY", start, horizon, request.corridor_id)

    await audit_service.log_action(
        db, current_user.employee_id, current_user.name, "GENERATE_MONTHLY_PLAN", "Plan", plan["plan_id"],
        {"start_date": start.isoformat(), "horizon_days": horizon, "blocks": plan["total_blocks"]},
    )

    return MonthlyPlanResponse(
        plan_id=plan["plan_id"],
        blocks=plan["blocks"],
        total_blocks=plan["total_blocks"],
        total_tasks_scheduled=plan["total_tasks_scheduled"],
        estimated_impact=plan["estimated_impact"],
        window=_window(plan["window"]),
        degraded=plan["degraded"],
    )


@router.get("/plans", response_model=PlanListResponse)
async def get_plans(
    horizon: Optional[str] = Query(None, description="weekly or monthly"),
    plan_type: Optional[str] = None,
    corridor_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Returns the list of generated block plans."""
    rows = await planning_service.list_plan_rows(db, horizon or plan_type, corridor_id, status)
    plans = planning_service.group_plans(rows)
    total = len(plans)
    start = (page - 1) * page_size
    items = plans[start:start + page_size]
    return PlanListResponse(items=items, plans=items, total=total)


@router.get("/plans/{plan_id}", response_model=PlanDetailResponse)
async def get_plan_details(plan_id: str, db: AsyncSession = Depends(get_db)):
    """Returns detailed block plan with all blocks."""
    rows = await planning_service.plan_rows(db, plan_id)
    if not rows:
        raise HTTPException(status_code=404, detail="Plan not found")

    start = min(r.window_start for r in rows)
    end = max(r.window_end for r in rows)
    days = max(1, (end.date() - start.date()).days + 1)
    return PlanDetailResponse(
        plan_id=plan_id,
        plan_type=rows[0].plan_type,
        window=PlanWindow(start=start, end=end, days=days),
        blocks=planning_service.rows_to_summaries(plan_id, rows),
        total_blocks=len(rows),
        total_tasks_scheduled=sum(len(r.merged_task_ids or []) for r in rows),
        estimated_impact=planning_service.plan_impact(rows),
        status=planning_service.plan_status(rows),
        created_at=min(r.created_at for r in rows),
    )
