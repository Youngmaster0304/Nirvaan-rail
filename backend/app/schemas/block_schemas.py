from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Literal
from datetime import datetime, date

class BlockBase(BaseModel):
    corridor_id: str = Field(description="ID of the corridor")
    section_id: str = Field(description="ID of the section")
    start_time: datetime = Field(description="Start time of the block")
    end_time: datetime = Field(description="End time of the block")
    departments: List[str] = Field(description="Departments involved in the block")
    task_ids: List[str] = Field(description="List of tasks included in the block")

class BlockCreate(BlockBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "corridor_id": "COR-001",
                    "section_id": "SEC-001",
                    "start_time": "2024-01-02T10:00:00Z",
                    "end_time": "2024-01-02T14:00:00Z",
                    "departments": ["Engineering", "S&T"],
                    "task_ids": ["TSK-1001", "TSK-1002"]
                }
            ]
        }
    )

class BlockResponse(BlockBase):
    block_id: str = Field(description="Unique ID of the block")
    status: str = Field(description="Current status of the block")
    created_at: datetime = Field(description="Creation timestamp")

class BlockPlanSummary(BaseModel):
    block_id: str
    section: str
    window: str
    departments: List[str]
    task_count: int
    status: str
    corridor_id: str = ""
    corridor_name: str = ""
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    task_ids: List[str] = []
    impact_score: float = 0.0

class PlanWindow(BaseModel):
    start: datetime
    end: datetime
    days: int

class PlanRequest(BaseModel):
    start_date: Optional[date] = Field(None, description="First day of the planning window (defaults to today)")
    horizon_days: Optional[int] = Field(None, description="Length of the planning window in days")
    corridor_id: Optional[str] = Field(None, description="Restrict planning to one corridor")
    week_number: Optional[int] = Field(None, description="Legacy: ISO week number")
    year: Optional[int] = Field(None, description="Legacy: year")

class WeeklyPlanRequest(PlanRequest):
    horizon_days: Optional[int] = Field(default=7, description="Length of the planning window in days")

class MonthlyPlanRequest(PlanRequest):
    horizon_days: Optional[int] = Field(default=30, description="Length of the planning window in days")

class WeeklyPlanResponse(BaseModel):
    plan_id: str
    blocks: List[BlockPlanSummary]
    total_blocks: int
    total_tasks_scheduled: int
    estimated_impact: str
    window: PlanWindow
    degraded: bool = False
    model_version: str = "v2.1"

class MonthlyPlanResponse(WeeklyPlanResponse):
    pass

class PlanListItem(BaseModel):
    plan_id: str
    plan_type: str
    window: PlanWindow
    total_blocks: int
    total_tasks_scheduled: int
    estimated_impact: str
    status: str
    created_at: datetime
    corridor_id: Optional[str] = None

class PlanListResponse(BaseModel):
    items: List[PlanListItem]
    plans: List[PlanListItem]
    total: int

class PlanDetailResponse(BaseModel):
    plan_id: str
    plan_type: str
    window: PlanWindow
    blocks: List[BlockPlanSummary]
    total_blocks: int
    total_tasks_scheduled: int
    estimated_impact: str
    status: str
    created_at: datetime
    degraded: bool = False

class MergeSuggestion(BaseModel):
    task_ids: List[str]
    section_id: str
    reason: str
    estimated_savings_hours: float
