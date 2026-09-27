import logging
from typing import Any, Dict, Iterable, List, Sequence

from sqlalchemy.ext.asyncio import AsyncSession

from app.ml.model_manager import get_prioritizer
from app.ml.policy_layer import PolicyLayer

logger = logging.getLogger(__name__)

MODEL_VERSION = "v2.1"

FEATURE_LABELS = {
    "defect_severity_encoded": "Defect severity",
    "days_overdue": "Days overdue",
    "days_overdue_normalized": "Days overdue (normalised)",
    "section_criticality_encoded": "Section criticality",
    "asset_age_years": "Asset age (years)",
    "historical_failure_rate": "Historical failure rate",
    "corridor_traffic_density": "Corridor traffic density",
    "weather_risk": "Weather risk",
    "department_encoded": "Department",
    "required_duration_hours": "Required duration (h)",
    "safety_constraint_count": "Safety constraints",
    "has_incompatible_tasks": "Incompatible tasks",
}

TASK_FIELDS = (
    "task_id", "department", "source_system", "asset_type", "section_id", "corridor_id",
    "corridor_name", "defect_type", "defect_severity", "days_overdue", "due_date",
    "required_duration_min", "safety_constraints", "weather_sensitivity", "incompatible_with",
    "asset_age_years", "historical_failure_rate", "section_criticality",
    "corridor_traffic_density", "status", "priority_score",
)


def task_to_dict(task: Any) -> Dict[str, Any]:
    if isinstance(task, dict):
        return task
    return {field: getattr(task, field, None) for field in TASK_FIELDS}


def score_task_dicts(task_dicts: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Runs LightGBM + SHAP + policy overrides for a batch of task dicts."""
    if not task_dicts:
        return []
    prioritizer = get_prioritizer()
    raw = prioritizer.prioritize_batch(list(task_dicts))
    results = []
    for task, (ml_score, shap_values) in zip(task_dicts, raw):
        final_score, applied_rules = PolicyLayer.apply_policy(task, ml_score)
        results.append({
            "ml_score": round(float(ml_score), 2),
            "score": round(float(final_score), 2),
            "shap_values": shap_values,
            "policy_rules": applied_rules,
        })
    return results


async def score_and_persist(db: AsyncSession, tasks: Iterable[Any], force: bool = False) -> List[Dict[str, Any]]:
    """Scores tasks, writes priority_score + shap_values + policy_rules onto the rows."""
    tasks = list(tasks)
    if not tasks:
        return []
    if not force and all(getattr(t, "priority_score", None) is not None for t in tasks):
        return [
            {
                "ml_score": None,
                "score": float(t.priority_score),
                "shap_values": t.shap_values or {},
                "policy_rules": list(getattr(t, "policy_rules", None) or []),
            }
            for t in tasks
        ]

    dicts = [task_to_dict(t) for t in tasks]
    results = score_task_dicts(dicts)
    for task, result in zip(tasks, results):
        task.priority_score = result["score"]
        task.shap_values = result["shap_values"]
        task.policy_rules = result["policy_rules"]
    await db.commit()
    logger.info("Scored %s tasks (model %s)", len(tasks), MODEL_VERSION)
    return results


def get_model_version() -> str:
    return MODEL_VERSION
