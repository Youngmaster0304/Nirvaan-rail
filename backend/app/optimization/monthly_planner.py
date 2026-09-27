from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class MonthlyPlanResult(BaseModel):
    blocks: List[Dict[str, Any]]
    stats: Dict[str, Any]
    checklist: List[Dict[str, Any]]

class MonthlyPlanner:
    """Monthly plan generator."""

    def __init__(self, optimizer, prioritizer, corridor_graph):
        self.optimizer = optimizer
        self.prioritizer = prioritizer
        self.corridor_graph = corridor_graph

    def generate_plan(
        self,
        corridor_id: Optional[str],
        month: int,
        year: int,
        tasks: Optional[List[Dict[str, Any]]] = None,
        time_horizon_days: int = 30,
        timetable: Optional[List[Dict[str, Any]]] = None,
    ) -> MonthlyPlanResult:
        """Generates monthly optimized plan."""
        jobs = tasks if tasks is not None else self._default_tasks()
        opt_res = self.optimizer.optimize(jobs, time_horizon_days, timetable or [])

        stats = dict(opt_res.statistics)
        stats.update({
            "jobs": len(jobs),
            "unscheduled_tasks": opt_res.unscheduled_tasks,
            "month": month,
            "year": year,
        })

        return MonthlyPlanResult(
            blocks=opt_res.blocks,
            stats=stats,
            checklist=self._generate_resource_checklist(opt_res.blocks),
        )

    def _default_tasks(self) -> List[Dict[str, Any]]:
        return [
            {"id": f"TASK_{i}", "section_id": "SEC-1-1", "department": "Engineering",
             "estimated_duration_min": 120, "task_ids": [f"TASK_{i}"]}
            for i in range(15)
        ]

    def _predict_degradation(self, section_id: str, asset_type: str, months_ahead: int) -> float:
        """Simple degradation model."""
        return 0.1 * months_ahead

    def _generate_resource_checklist(self, plan: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Materials, crew, machines needed."""
        machine_count = max(1, len(plan) // 4)
        return [
            {"resource": "Track Machine (TD-20)", "quantity": machine_count},
            {"resource": "Ballast (cum)", "quantity": machine_count * 40},
            {"resource": "Relay sets", "quantity": max(1, len(plan) // 6)},
            {"resource": "OHE replacement kits", "quantity": max(1, len(plan) // 8)},
            {"resource": "Engineering gang", "quantity": machine_count * 4},
        ]
