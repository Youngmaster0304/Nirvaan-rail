from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class TrainImpactDetail(BaseModel):
    train_number: str = Field(description="Train number")
    train_name: str = Field(description="Train name")
    delay_minutes: int = Field(description="Estimated delay in minutes")
    delay_reason: str = Field(description="Reason for delay")

class SimulationRequest(BaseModel):
    plan_id: str = Field(description="ID of the plan to simulate")
    scenario_name: Optional[str] = Field(default="baseline", description="Name of the scenario")

class SimulationResult(BaseModel):
    plan_id: str
    trains_affected: int
    avg_delay_minutes: float
    freight_throughput_impact_pct: float
    corridor_capacity_pct: float
    details: Dict[str, Any] = Field(description="Per-block and per-train detail of the simulation")
    with_ai: Dict[str, Any] = Field(description="Metrics with AI-coordinated blocks")
    without_ai: Dict[str, Any] = Field(description="Metrics with uncoordinated baseline scheduling")
    scenario_name: str = "baseline"
    comparison: Dict[str, Any] = Field(default_factory=dict, description="Legacy with_ai vs without_ai comparison")
