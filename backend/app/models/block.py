from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Integer, Float, JSON, DateTime, Text
from datetime import datetime
from typing import Optional, List
from .base import BaseModel

class BlockPlan(BaseModel):
    __tablename__ = "block_plans"

    plan_id: Mapped[Optional[str]] = mapped_column(String, nullable=True, index=True)
    block_id: Mapped[str] = mapped_column(String, unique=True, index=True)
    section_id: Mapped[str] = mapped_column(String)
    corridor_id: Mapped[str] = mapped_column(String)
    corridor_name: Mapped[str] = mapped_column(String)
    window_start: Mapped[datetime] = mapped_column(DateTime)
    window_end: Mapped[datetime] = mapped_column(DateTime)
    departments: Mapped[List[str]] = mapped_column(JSON)
    merged_task_ids: Mapped[List[str]] = mapped_column(JSON)
    plan_type: Mapped[str] = mapped_column(String)
    plan_week: Mapped[int] = mapped_column(Integer)
    plan_year: Mapped[int] = mapped_column(Integer)
    impact_score: Mapped[float] = mapped_column(Float)
    trains_affected: Mapped[int] = mapped_column(Integer)
    avg_delay_minutes: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String, default="DRAFT")
    approved_by: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    approved_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<BlockPlan {self.block_id} - {self.status}>"
