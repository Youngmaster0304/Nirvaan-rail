from typing import List, Dict, Tuple, Any
from pydantic import BaseModel
from .corridor_graph import CorridorGraph

class MergeGroup(BaseModel):
    task_ids: List[str]
    section_id: str
    combined_duration: int
    departments: List[str]
    savings_hours: float
    reason: str

class TaskMerger:
    """Task merging intelligence."""
    
    def __init__(self, corridor_graph: CorridorGraph):
        self.corridor_graph = corridor_graph

    def find_merge_candidates(self, tasks: List[Dict[str, Any]]) -> List[MergeGroup]:
        """Find candidates for task merging based on constraints."""
        groups = []
        section_tasks = {}
        for task in tasks:
            sec_id = task.get("section_id")
            if sec_id:
                if sec_id not in section_tasks:
                    section_tasks[sec_id] = []
                section_tasks[sec_id].append(task)
                
        for sec_id, t_list in section_tasks.items():
            if len(t_list) < 2:
                continue
                
            # Naive O(N^2) pairing for demonstration
            for i in range(len(t_list)):
                for j in range(i + 1, len(t_list)):
                    t1 = t_list[i]
                    t2 = t_list[j]
                    
                    combined_dur = t1.get("estimated_duration_min", 0) + t2.get("estimated_duration_min", 0)
                    
                    # Max block duration check (6 hours = 360 min)
                    if combined_dur > 360:
                        continue
                        
                    deps = list(set([t1.get("department"), t2.get("department")]))
                    
                    incompat = t1.get("incompatible_with", [])
                    if t2.get("id") in incompat or t2.get("department") in incompat:
                        continue
                        
                    mg = MergeGroup(
                        task_ids=[t1["id"], t2["id"]],
                        section_id=sec_id,
                        combined_duration=combined_dur,
                        departments=deps,
                        savings_hours=(combined_dur * 0.2) / 60.0, # assumed 20% setup time savings
                        reason="Compatible tasks on same section"
                    )
                    groups.append(mg)
        return groups

    def estimate_merge_savings(self, group: MergeGroup) -> float:
        """Hours saved by merging."""
        return group.savings_hours

    def validate_merge(self, group: MergeGroup) -> Tuple[bool, str]:
        """Check if merge is feasible."""
        if group.combined_duration > 360:
            return False, "Combined duration exceeds 360 minutes"
        return True, "Valid merge"
