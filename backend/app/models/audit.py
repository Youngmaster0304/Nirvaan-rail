from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Boolean, DateTime, Text, func
from datetime import datetime
from typing import Optional
from .base import BaseModel

class AuditLog(BaseModel):
    __tablename__ = "audit_logs"

    timestamp: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    user_id: Mapped[str] = mapped_column(String)
    user_name: Mapped[str] = mapped_column(String)
    action: Mapped[str] = mapped_column(String)
    entity_type: Mapped[str] = mapped_column(String)
    entity_id: Mapped[str] = mapped_column(String)
    details: Mapped[str] = mapped_column(Text)
    reason: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    is_override: Mapped[bool] = mapped_column(Boolean, default=False)
    ip_address: Mapped[Optional[str]] = mapped_column(String, nullable=True)
