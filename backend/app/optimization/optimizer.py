import math
from typing import List, Dict, Any
from pydantic import BaseModel
from ortools.sat.python import cp_model
from .corridor_graph import CorridorGraph
from .task_merger import TaskMerger

class OptimizationResult(BaseModel):
    blocks: List[Dict[str, Any]]
    unscheduled_tasks: List[str]
    statistics: Dict[str, Any]

class BlockOptimizer:
    """OR-Tools CP-SAT block scheduling optimizer."""

    MAX_BLOCK_SLOTS = 12  # 12 x 30-minute slots = 6-hour block ceiling
    SLOT_MINUTES = 30

    def __init__(self, corridor_graph: CorridorGraph, task_merger: TaskMerger):
        self.corridor_graph = corridor_graph
        self.task_merger = task_merger

    @classmethod
    def duration_slots(cls, minutes: int) -> int:
        return max(1, min(cls.MAX_BLOCK_SLOTS, math.ceil((minutes or cls.SLOT_MINUTES) / cls.SLOT_MINUTES)))

    def optimize(self, tasks: List[Dict[str, Any]], time_horizon_days: int, timetable: List[Dict[str, Any]]) -> OptimizationResult:
        """Runs the OR-Tools optimizer."""
        if not tasks:
            return OptimizationResult(blocks=[], unscheduled_tasks=[], statistics={"status": "EMPTY", "objective": 0})

        model = cp_model.CpModel()

        num_tasks = len(tasks)
        num_slots = len(self._create_time_slots(time_horizon_days))
        max_blocks = num_tasks
        slot_per_task = [
            self.duration_slots(int(t.get("estimated_duration_min", 60)))
            for t in tasks
        ]

        block_start = [model.NewIntVar(0, num_slots - 1, f'block_start_{i}') for i in range(max_blocks)]
        block_duration = [model.NewIntVar(0, self.MAX_BLOCK_SLOTS, f'block_duration_{i}') for i in range(max_blocks)]
        block_end = [model.NewIntVar(0, num_slots - 1, f'block_end_{i}') for i in range(max_blocks)]
        block_active = [model.NewBoolVar(f'block_active_{i}') for i in range(max_blocks)]

        block_assigned = {}
        for i in range(max_blocks):
            model.Add(block_end[i] == block_start[i] + block_duration[i]).OnlyEnforceIf(block_active[i])
            for j in range(num_tasks):
                block_assigned[(i, j)] = model.NewBoolVar(f'block_assigned_{i}_{j}')

        for j in range(num_tasks):
            model.Add(sum(block_assigned[(i, j)] for i in range(max_blocks)) <= 1)

        for i in range(max_blocks):
            model.Add(sum(block_assigned[(i, j)] for j in range(num_tasks)) > 0).OnlyEnforceIf(block_active[i])
            model.Add(sum(block_assigned[(i, j)] for j in range(num_tasks)) == 0).OnlyEnforceIf(block_active[i].Not())

            load = sum(block_assigned[(i, j)] * slot_per_task[j] for j in range(num_tasks))
            model.Add(block_duration[i] == load)
            model.Add(load <= self.MAX_BLOCK_SLOTS)

        assigned_total = sum(block_assigned[(i, j)] for i in range(max_blocks) for j in range(num_tasks))
        active_total = sum(block_active)
        model.Maximize(10 * assigned_total - active_total)

        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 30.0
        status = solver.Solve(model)

        ok = status in (cp_model.OPTIMAL, cp_model.FEASIBLE)
        blocks = self._extract_solution(
            solver, status, max_blocks, num_tasks, block_assigned, block_start, slot_per_task, tasks
        ) if ok else []

        scheduled_ids = {task_id for block in blocks for task_id in block["tasks"]}
        return OptimizationResult(
            blocks=blocks,
            unscheduled_tasks=[t["id"] for t in tasks if t["id"] not in scheduled_ids],
            statistics={
                "status": solver.StatusName(status),
                "objective": solver.ObjectiveValue() if ok else 0,
                "jobs": num_tasks,
                "time_horizon_days": time_horizon_days,
            },
        )

    def _create_time_slots(self, days: int) -> List[int]:
        """30-minute slots for the horizon."""
        return list(range(max(1, days) * 24 * 2))

    def _get_timetable_constraints(self, section_id: str, timetable: List[Dict[str, Any]]) -> List[int]:
        """Blocked time slots based on train runs."""
        return []

    def _extract_solution(self, solver, status, max_blocks, num_tasks, block_assigned, block_start, slot_per_task, tasks) -> List[Dict[str, Any]]:
        """Extract block assignments from solver."""
        if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return []

        blocks = []
        for i in range(max_blocks):
            assigned_jobs = []
            slots = 0
            for j in range(num_tasks):
                if solver.Value(block_assigned[(i, j)]):
                    assigned_jobs.append(tasks[j])
                    slots += slot_per_task[j]

            if assigned_jobs:
                task_ids = []
                for job in assigned_jobs:
                    task_ids.extend(job.get("task_ids") or [job["id"]])
                blocks.append({
                    "block_id": f"BLK_{i}",
                    "start_slot": solver.Value(block_start[i]),
                    "duration_slots": slots,
                    "jobs": [job["id"] for job in assigned_jobs],
                    "tasks": task_ids,
                })
        return blocks
