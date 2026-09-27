from pydantic import BaseModel, Field, model_validator
from typing import Optional, Dict, Any
from datetime import datetime

class ReportRequest(BaseModel):
    type: str = Field(default="", description="Report type: productivity, utilization, health, overdue or accuracy")
    report_type: Optional[str] = Field(default=None, description="Legacy alias for type")
    plan_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    corridor_id: Optional[str] = None

    @model_validator(mode="after")
    def _resolve_type(self) -> "ReportRequest":
        if not self.type and self.report_type:
            self.type = self.report_type
        if not self.type:
            raise ValueError("type is required")
        return self

class ReportResponse(BaseModel):
    report_id: str
    report_type: str
    summary: str
    download_url: str
    generated_at: datetime
    data: Dict[str, Any] = Field(default_factory=dict)
