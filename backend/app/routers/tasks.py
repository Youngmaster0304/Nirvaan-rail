from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import uuid
import datetime

from app.database import get_db
from app.models import Corridor, MaintenanceTask, Section
from app.schemas import TaskResponse, TaskCreate, TaskBulkAction, TaskBulkActionResult, TaskListResponse
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
audit_service = AuditService()

SOURCE_BY_DEPARTMENT = {"Engineering": "TMS", "S&T": "SMMS", "Traction": "TDMS"}


@router.get("", response_model=TaskListResponse)
async def get_tasks(
    department: Optional[str] = None,
    severity: Optional[str] = None,
    corridor_id: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Returns a paginated list of maintenance tasks."""
    query = select(MaintenanceTask)

    if department:
        query = query.where(func.upper(MaintenanceTask.department) == department.upper())
    if severity:
        query = query.where(func.upper(MaintenanceTask.defect_severity) == severity.upper())
    if corridor_id:
        query = query.where(MaintenanceTask.corridor_id == corridor_id)
    if status:
        query = query.where(func.upper(MaintenanceTask.status) == status.upper())

    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one_or_none() or 0

    query = (
        query.order_by(MaintenanceTask.priority_score.desc().nulls_last(), MaintenanceTask.days_overdue.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    items = [TaskResponse.model_validate(task) for task in result.scalars().all()]

    return TaskListResponse(items=items, tasks=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=TaskResponse)
async def create_task(
    task: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Creates a new maintenance task."""
    source = SOURCE_BY_DEPARTMENT.get(task.department, "TMS")
    task_id = f"{source}-2026-{uuid.uuid4().hex[:8].upper()}"

    corridor = await db.execute(select(Corridor).where(Corridor.corridor_id == task.corridor_id))
    corridor = corridor.scalar_one_or_none()
    section = await db.execute(select(Section).where(Section.section_id == task.section_id))
    section = section.scalar_one_or_none()

    constraints = task.safety_constraints or []
    if isinstance(constraints, str):
        constraints = [constraints] if constraints else []

    new_task = MaintenanceTask(
        task_id=task_id,
        department=task.department,
        source_system=source,
        asset_type=task.asset_type,
        section_id=task.section_id,
        corridor_id=task.corridor_id,
        corridor_name=corridor.name if corridor else f"Corridor {task.corridor_id}",
        defect_type=task.defect_type,
        defect_severity=task.defect_severity,
        days_overdue=0,
        due_date=datetime.date.today(),
        required_duration_min=task.required_duration_min,
        safety_constraints=constraints,
        weather_sensitivity=bool(task.weather_sensitivity),
        incompatible_with=[],
        asset_age_years=5.0,
        historical_failure_rate=0.05,
        section_criticality="JUNCTION" if section and "Junction" in section.to_station_name else "MAINLINE",
        corridor_traffic_density=100,
        status="PENDING",
    )
    db.add(new_task)
    await db.flush()
    await audit_service.log_action(
        db, current_user.employee_id, current_user.name, "CREATE_TASK", "Task", task_id,
        {"department": task.department, "defect_type": task.defect_type},
    )
    await db.commit()
    await db.refresh(new_task)
    return TaskResponse.model_validate(new_task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_by_id(task_id: str, db: AsyncSession = Depends(get_db)):
    """Returns a single task with full details including SHAP explanations."""
    result = await db.execute(select(MaintenanceTask).where(MaintenanceTask.task_id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return TaskResponse.model_validate(task)


@router.post("/bulk-action", response_model=TaskBulkActionResult)
async def bulk_action_tasks(
    action_req: TaskBulkAction,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Approves or rejects multiple tasks."""
    new_status = "APPROVED" if action_req.action == "APPROVE" else "REJECTED"
    result = await db.execute(select(MaintenanceTask).where(MaintenanceTask.task_id.in_(action_req.task_ids)))
    tasks = result.scalars().all()
    for task in tasks:
        task.status = new_status

    await audit_service.log_actions(
        db,
        [
            {
                "user_id": current_user.employee_id,
                "user_name": current_user.name,
                "action": f"BULK_{action_req.action}",
                "entity_type": "Task",
                "entity_id": task.task_id,
                "details": {"reason": action_req.reason, "status": new_status},
                "reason": action_req.reason,
            }
            for task in tasks
        ],
    )
    await db.commit()

    return TaskBulkActionResult(
        updated=len(tasks),
        message=f"Successfully processed {len(tasks)} tasks.",
    )
