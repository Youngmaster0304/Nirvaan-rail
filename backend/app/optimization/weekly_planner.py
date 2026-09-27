from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class WeeklyPlanResult(BaseModel):
    blocks: List[Dict[str, Any]]
    stats: Dict[str, Any]
    explanations: str

class WeeklyPlanner:
    """Weekly plan generator: merge -> CP-SAT optimise -> explain."""

    def __init__(self, optimizer, prioritizer, corridor_graph):
        self.optimizer = optimizer
        self.prioritizer = prioritizer
        self.corridor_graph = corridor_graph

    def generate_plan(
        self,
        corridor_id: Optional[str],
        week: int,
        year: int,
        tasks: Optional[List[Dict[str, Any]]] = None,
        time_horizon_days: int = 7,
        timetable: Optional[List[Dict[str, Any]]] = None,
    ) -> WeeklyPlanResult:
        """Generates weekly optimized plan."""
        jobs = tasks if tasks is not None else self._default_tasks()
        opt_res = self.optimizer.optimize(jobs, time_horizon_days, timetable or [])

        stats = dict(opt_res.statistics)
        stats.update({
            "jobs": len(jobs),
            "unscheduled_tasks": opt_res.unscheduled_tasks,
            "week": week,
            "year": year,
        })

        return WeeklyPlanResult(
            blocks=opt_res.blocks,
            stats=stats,
            explanations=self._generate_plan_explanation(opt_res.blocks),
        )

    def _default_tasks(self) -> List[Dict[str, Any]]:
        return [
            {"id": f"TASK_{i}", "section_id": "SEC-1-1", "department": "Engineering",
             "estimated_duration_min": 120, "task_ids": [f"TASK_{i}"]}
            for i in range(5)
        ]

    def _format_day_plan(self, blocks: List[Dict[str, Any]], day: int) -> List[Dict[str, Any]]:
        return [b for b in blocks if b.get("start_slot", 0) // 48 == day]

    def _generate_plan_explanation(self, plan: List[Dict[str, Any]]) -> str:
        return f"Generated {len(plan)} optimal blocks for the week."
