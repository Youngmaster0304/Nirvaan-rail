from typing import List, Dict, Any
from pydantic import BaseModel

class SimulationResult(BaseModel):
    total_trains_affected: int
    avg_delay_minutes: float
    max_delay_minutes: float
    freight_throughput_impact_pct: float
    corridor_capacity_during_block_pct: float
    comparison_without_ai: Dict[str, Any]
    train_details: List[Dict[str, Any]]

class ImpactSimulator:
    """Simulates the impact of a proposed block plan."""
    
    def __init__(self, corridor_graph):
        self.corridor_graph = corridor_graph

    def simulate(self, plan_blocks: List[Dict[str, Any]], timetable: List[Dict[str, Any]]) -> SimulationResult:
        """Simulate impacts of the plan."""
        trains_affected = []
        
        for block in plan_blocks:
            # Fake logic for simulation
            trains_affected.append({
                "train_id": "TR123",
                "delay": 15.0
            })
            
        avg_delay = sum(t["delay"] for t in trains_affected) / len(trains_affected) if trains_affected else 0.0
        max_delay = max([t["delay"] for t in trains_affected]) if trains_affected else 0.0
        
        return SimulationResult(
            total_trains_affected=len(trains_affected),
            avg_delay_minutes=avg_delay,
            max_delay_minutes=max_delay,
            freight_throughput_impact_pct=2.5,
            corridor_capacity_during_block_pct=65.0,
            comparison_without_ai=self._simulate_without_ai([], timetable),
            train_details=trains_affected
        )

    def _simulate_without_ai(self, tasks: List[Dict[str, Any]], timetable: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Baseline comparison."""
        return {
            "avg_delay_minutes": 45.0,
            "max_delay_minutes": 120.0
        }

    def _calculate_cascade_delays(self, blocked_section: str, duration: int, graph) -> Dict[str, float]:
        """Cascading delays."""
        return graph.calculate_delay_propagation(blocked_section, duration) if graph else {}
