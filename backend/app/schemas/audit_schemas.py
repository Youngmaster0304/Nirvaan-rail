from pydantic import BaseModel, Field, ConfigDict, AliasChoices
from typing import Optional, List, Any, Dict
from datetime import datetime

class AuditEntryCreate(BaseModel):
    action: str = Field(description="Action performed")
    entity_type: str = Field(description="Type of entity affected")
    entity_id: str = Field(description="ID of the entity")
    details: Optional[Any] = None

class AuditEntryResponse(BaseModel):
    audit_id: str
    user_id: str
    user_name: str = ""
    action: str
    entity_type: str
    entity_id: str
    details: Optional[Any] = None
    reason: Optional[str] = None
    is_override: bool = False
    timestamp: datetime

class AuditListResponse(BaseModel):
    items: List[AuditEntryResponse]
    entries: List[AuditEntryResponse]
    total: int
    page: int
    page_size: int

class AuditLogFilter(BaseModel):
    action: Optional[str] = None
    entity_type: Optional[str] = None
    user_id: Optional[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None

class ApproveRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    plan_id: str = Field(validation_alias=AliasChoices("plan_id", "block_id"), description="Plan or block to approve")
    note: Optional[str] = Field(default=None, validation_alias=AliasChoices("note", "reason"))

class RejectRequest(ApproveRequest):
    pass

class DecisionResponse(BaseModel):
    ok: bool
    audit_id: str
    updated: int = 0
    plan_id: str = ""
