from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Literal, Union, Any
from datetime import datetime

class TaskBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    department: Literal['Engineering', 'S&T', 'Traction'] = Field(description="Department responsible for the task")
    asset_type: str = Field(description="Type of asset (e.g., Track, Signal, OHE)")
    section_id: str = Field(description="ID of the section")
    corridor_id: str = Field(description="ID of the corridor")
    defect_type: str = Field(description="Type of defect to be rectified")
    defect_severity: Literal['Low', 'Medium', 'High', 'Critical'] = Field(description="Severity of the defect")
    required_duration_min: int = Field(description="Required duration for the task in minutes")
    safety_constraints: Optional[Union[str, List[str]]] = Field(None, description="Any safety constraints")
    weather_sensitivity: Optional[Union[str, bool]] = Field(None, description="Weather sensitivity (e.g., Rain, Heat)")

class TaskCreate(TaskBase):
    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "department": "Engineering",
                    "asset_type": "Track",
                    "section_id": "SEC-001",
                    "corridor_id": "COR-001",
                    "defect_type": "Rail Fracture",
                    "defect_severity": "Critical",
                    "required_duration_min": 120,
                    "safety_constraints": "Requires complete track closure",
                    "weather_sensitivity": "Avoid heavy rain"
                }
            ]
        }
    )

class TaskResponse(TaskBase):
    task_id: str = Field(description="Unique ID of the task")
    status: str = Field(description="Current status of the task")
    days_overdue: int = Field(0, description="Days past the due date; greater than 0 means the task is overdue")
    priority_score: Optional[float] = Field(None, description="AI-generated priority score")
    shap_values: Optional[Dict[str, float]] = Field(None, description="SHAP values for the priority score")
    created_at: datetime = Field(description="Creation timestamp")
    updated_at: datetime = Field(description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "examples": [
                {
                    "task_id": "TSK-1001",
                    "department": "Engineering",
                    "asset_type": "Track",
                    "section_id": "SEC-001",
                    "corridor_id": "COR-001",
                    "defect_type": "Rail Fracture",
                    "defect_severity": "Critical",
                    "required_duration_min": 120,
                    "safety_constraints": ["Requires complete track closure"],
                    "weather_sensitivity": True,
                    "status": "PENDING",
                    "days_overdue": 12,
                    "priority_score": 0.95,
                    "shap_values": {"defect_severity_Critical": 0.5, "required_duration_min": -0.1},
                    "created_at": "2024-01-01T10:00:00Z",
                    "updated_at": "2024-01-01T10:00:00Z"
                }
            ]
        }
    )

class TaskPrioritized(TaskResponse):
    priority_rank: int = Field(description="Rank among prioritized tasks")
    shap_explanation: Dict[str, float] = Field(description="Explanation of feature contributions")
    policy_rules: List[str] = Field(default_factory=list, description="Safety policy rules applied to this task")

class TaskFilter(BaseModel):
    department: Optional[str] = None
    severity: Optional[str] = None
    corridor_id: Optional[str] = None
    status: Optional[str] = None
    min_priority: Optional[float] = None
    max_priority: Optional[float] = None

class TaskBulkAction(BaseModel):
    task_ids: List[str] = Field(description="List of task IDs")
    action: Literal['APPROVE', 'REJECT'] = Field(description="Action to perform")
    reason: Optional[str] = Field(None, description="Reason for the action")

class TaskBulkActionResult(BaseModel):
    updated: int
    message: str

class TaskListResponse(BaseModel):
    items: List[TaskResponse]
    tasks: List[TaskResponse]
    total: int
    page: int
    page_size: int

class PrioritizeRequest(BaseModel):
    task_ids: Optional[List[str]] = Field(default_factory=list, description="List of task IDs to prioritize, empty for all")
    force_reprioritize: bool = Field(default=False, description="Force re-prioritization even if already prioritized")

class PrioritizeResponse(BaseModel):
    tasks: List[TaskPrioritized] = Field(description="Prioritized tasks")
    total_count: int = Field(description="Total number of tasks prioritized")
    model_version: str = Field(default="v2.1", description="Version of the prioritisation model")
    timestamp: datetime = Field(description="Timestamp of prioritization")

class PrioritizeResultsResponse(BaseModel):
    items: List[TaskPrioritized]
    tasks: List[TaskPrioritized]
    total_count: int
    model_version: str = "v2.1"
    timestamp: datetime

class ShapContribution(BaseModel):
    feature: str
    value: float
    display: str

class ShapExplanationResponse(BaseModel):
    task_id: str
    base_value: float
    score: float
    contributions: List[ShapContribution]
    model_version: str = "v2.1"
    policy_rules: List[str] = []
    note: Optional[str] = None
