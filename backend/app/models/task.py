from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Float, Boolean, JSON, ForeignKey, Date
from datetime import date
from typing import Optional, List
from .base import BaseModel

class MaintenanceTask(BaseModel):
    __tablename__ = "maintenance_tasks"

    task_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    department: Mapped[str] = mapped_column(String)
    source_system: Mapped[str] = mapped_column(String)
    asset_type: Mapped[str] = mapped_column(String)
    section_id: Mapped[str] = mapped_column(String, index=True)
    corridor_id: Mapped[str] = mapped_column(String, index=True)
    corridor_name: Mapped[str] = mapped_column(String)
    defect_type: Mapped[str] = mapped_column(String)
    defect_severity: Mapped[str] = mapped_column(String)
    days_overdue: Mapped[int] = mapped_column(Integer)
    due_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    required_duration_min: Mapped[int] = mapped_column(Integer)
    safety_constraints: Mapped[List[str]] = mapped_column(JSON)
    weather_sensitivity: Mapped[bool] = mapped_column(Boolean)
    incompatible_with: Mapped[List[str]] = mapped_column(JSON)
    asset_age_years: Mapped[float] = mapped_column(Float)
    historical_failure_rate: Mapped[float] = mapped_column(Float)
    section_criticality: Mapped[str] = mapped_column(String)
    corridor_traffic_density: Mapped[int] = mapped_column(Integer)
    priority_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    shap_values: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    policy_rules: Mapped[Optional[list]] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String, default='PENDING')
    assigned_block_id: Mapped[Optional[str]] = mapped_column(String, ForeignKey("block_plans.block_id"), nullable=True)

    def __repr__(self) -> str:
        return f"<MaintenanceTask {self.task_id} - {self.status}>"
