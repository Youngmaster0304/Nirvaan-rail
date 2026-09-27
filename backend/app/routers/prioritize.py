from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List
import datetime

from app.database import get_db
from app.models import MaintenanceTask
from app.schemas import (
    PrioritizeRequest,
    PrioritizeResponse,
    PrioritizeResultsResponse,
    ShapContribution,
    ShapExplanationResponse,
    TaskPrioritized,
    TaskResponse,
)
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService
from app.services.scoring_service import (
    FEATURE_LABELS,
    MODEL_VERSION,
    get_model_version,
    score_and_persist,
    score_task_dicts,
    task_to_dict,
)
from app.ml.model_manager import get_prioritizer
from app.ml.policy_layer import PolicyLayer
from app.ml.feature_engineering import extract_features

router = APIRouter(prefix="/api/prioritize", tags=["Prioritization"])
audit_service = AuditService()


def _prioritized(task: MaintenanceTask, rank: int) -> TaskPrioritized:
    base = TaskResponse.model_validate(task)
    return TaskPrioritized(
        **base.model_dump(),
        priority_rank=rank,
        shap_explanation={k: float(v) for k, v in (task.shap_values or {}).items()},
        policy_rules=list(task.policy_rules or []),
    )


@router.post("", response_model=PrioritizeResponse)
async def run_prioritization(
    request: PrioritizeRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Runs LightGBM prioritization + policy layer on tasks and persists the scores."""
    query = select(MaintenanceTask)
    if request.task_ids:
        query = query.where(MaintenanceTask.task_id.in_(request.task_ids))
    tasks = list((await db.execute(query)).scalars().all())

    results = await score_and_persist(db, tasks, force=request.force_reprioritize)

    ranked = sorted(zip(tasks, results), key=lambda pair: -pair[1]["score"])
    items = [
        _prioritized(task, rank)
        for rank, (task, _) in enumerate(ranked, start=1)
    ]

    await audit_service.log_action(
        db, current_user.employee_id, current_user.name, "PRIORITIZE_TASKS", "Task", "multiple",
        {"force": request.force_reprioritize, "count": len(tasks)},
    )

    return PrioritizeResponse(
        tasks=items,
        total_count=len(items),
        model_version=get_model_version(),
        timestamp=datetime.datetime.utcnow(),
    )


@router.get("/results", response_model=PrioritizeResultsResponse)
async def get_prioritization_results(
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db)
):
    """Returns all tasks sorted by priority_score desc."""
    query = select(MaintenanceTask).order_by(
        MaintenanceTask.priority_score.desc().nulls_last(), MaintenanceTask.days_overdue.desc()
    )
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    tasks = list((await db.execute(query.limit(limit))).scalars().all())

    items = [_prioritized(task, rank) for rank, task in enumerate(tasks, start=1)]
    return PrioritizeResultsResponse(
        items=items,
        tasks=items,
        total_count=int(total),
        model_version=get_model_version(),
        timestamp=datetime.datetime.utcnow(),
    )


@router.get("/shap/{task_id}", response_model=ShapExplanationResponse)
async def get_shap_explanation(task_id: str, db: AsyncSession = Depends(get_db)):
    """Returns the SHAP factor contributions behind a task's priority score."""
    task = (await db.execute(select(MaintenanceTask).where(MaintenanceTask.task_id == task_id))).scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task_dict = task_to_dict(task)
    prioritizer = get_prioritizer()
    shap_values = prioritizer.get_shap_explanation(task_dict)

    if task.priority_score is None:
        result = score_task_dicts([task_dict])[0]
        task.priority_score = result["score"]
        task.shap_values = result["shap_values"]
        task.policy_rules = result["policy_rules"]
        await db.commit()
        shap_values = result["shap_values"]

    policy_rules = list(task.policy_rules or [])
    if not policy_rules:
        _, policy_rules = PolicyLayer.apply_policy(task_dict, float(task.priority_score or 0.0))

    feature_values = extract_features(task_dict)

    contributions = [
        ShapContribution(
            feature=feature,
            value=float(value),
            display=(
                f"{FEATURE_LABELS.get(feature, feature.replace('_', ' ').capitalize())} = "
                f"{feature_values.get(feature, 0):g} → {value:+.2f}"
            ),
        )
        for feature, value in shap_values.items()
    ]
    contributions.sort(key=lambda c: abs(c.value), reverse=True)

    expected_value = getattr(prioritizer.explainer, "expected_value", 0.0)

    return ShapExplanationResponse(
        task_id=task.task_id,
        base_value=float(expected_value),
        score=float(task.priority_score or 0.0),
        contributions=contributions,
        model_version=get_model_version(),
        policy_rules=policy_rules,
        note="Model v2.1 trained on synthetic labels; policy overrides supersede ML output.",
    )
