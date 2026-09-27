from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from typing import Optional, List, Dict, Any
import datetime

from app.database import get_db
from app.models import AuditLog, BlockPlan
from app.schemas import AuditEntryResponse, AuditListResponse, ApproveRequest, RejectRequest, DecisionResponse
from app.routers.auth import get_current_user, UserInfo
from app.services.audit_service import AuditService, parse_details

router = APIRouter(prefix="/api", tags=["Audit"])
audit_service = AuditService()

APPROVER_ROLES = {"DISPATCHER", "SUPERVISOR", "ADMIN"}


@router.get("/audit", response_model=AuditListResponse)
async def get_audit_logs(
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    user_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """Returns paginated audit log."""
    filters: Dict[str, Any] = {"action": action, "entity_type": entity_type, "user_id": user_id}
    if date_from:
        filters["date_from"] = datetime.datetime.fromisoformat(date_from)
    if date_to:
        filters["date_to"] = datetime.datetime.fromisoformat(date_to)

    rows, total = await audit_service.get_logs(db, filters, page, page_size)
    items = [
        AuditEntryResponse(
            audit_id=str(row.id),
            user_id=row.user_id,
            user_name=row.user_name,
            action=row.action,
            entity_type=row.entity_type,
            entity_id=row.entity_id,
            details=parse_details(row.details),
            reason=row.reason,
            is_override=row.is_override,
            timestamp=row.timestamp,
        )
        for row in rows
    ]
    return AuditListResponse(items=items, entries=items, total=total, page=page, page_size=page_size)


async def _resolve_plan(db: AsyncSession, plan_id: str) -> List[BlockPlan]:
    result = await db.execute(
        select(BlockPlan).where(or_(BlockPlan.plan_id == plan_id, BlockPlan.block_id == plan_id))
    )
    return list(result.scalars().all())


async def _decide(
    request: ApproveRequest,
    decision: str,
    db: AsyncSession,
    current_user: UserInfo,
) -> DecisionResponse:
    if current_user.role.upper().replace(" ", "_") not in APPROVER_ROLES:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    blocks = await _resolve_plan(db, request.plan_id)
    now = datetime.datetime.utcnow()
    for block in blocks:
        block.status = decision
        if decision == "APPROVED":
            block.approved_by = f"{current_user.name} ({current_user.employee_id})"
            block.approved_at = now
            block.rejection_reason = None
        else:
            block.rejection_reason = request.note
            block.approved_by = None
            block.approved_at = None

    audit_id = await audit_service.log_action(
        db,
        current_user.employee_id,
        current_user.name,
        f"{decision}_PLAN",
        "BlockPlan",
        request.plan_id,
        {"blocks": len(blocks), "note": request.note},
        reason=request.note,
    )
    await db.commit()
    return DecisionResponse(ok=True, audit_id=audit_id, updated=len(blocks), plan_id=request.plan_id)


@router.post("/approve", response_model=DecisionResponse)
async def approve_plan(
    request: ApproveRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Approves a block plan, updates status and writes an audit log row."""
    return await _decide(request, "APPROVED", db, current_user)


@router.post("/reject", response_model=DecisionResponse)
async def reject_plan(
    request: RejectRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserInfo = Depends(get_current_user)
):
    """Rejects a block plan, updates status and writes an audit log row."""
    return await _decide(request, "REJECTED", db, current_user)
