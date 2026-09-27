import json
import logging
from typing import Any, Dict, List, Optional, Sequence, Tuple

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

logger = logging.getLogger(__name__)


def _serialise_details(details: Any) -> str:
    if details is None:
        return ""
    if isinstance(details, str):
        return details
    try:
        return json.dumps(details, default=str)
    except (TypeError, ValueError):
        return str(details)


def parse_details(raw: Optional[str]) -> Any:
    if not raw:
        return None
    try:
        return json.loads(raw)
    except (TypeError, ValueError):
        return raw


class AuditService:
    """Append-only audit trail backed by the audit_logs table."""

    async def log_action(
        self,
        db_session: AsyncSession,
        user_id: str,
        user_name: str,
        action: str,
        entity_type: str,
        entity_id: str,
        details: Any = None,
        reason: Optional[str] = None,
        is_override: bool = False,
    ) -> str:
        audit_ids = await self.log_actions(
            db_session,
            [{
                "user_id": user_id,
                "user_name": user_name,
                "action": action,
                "entity_type": entity_type,
                "entity_id": entity_id,
                "details": details,
                "reason": reason,
                "is_override": is_override,
            }],
        )
        return audit_ids[0]

    async def log_actions(self, db_session: AsyncSession, entries: Sequence[Dict[str, Any]]) -> List[str]:
        audit_ids: List[str] = []
        for entry in entries:
            row = AuditLog(
                user_id=entry.get("user_id", ""),
                user_name=entry.get("user_name", ""),
                action=entry.get("action", ""),
                entity_type=entry.get("entity_type", ""),
                entity_id=str(entry.get("entity_id", "")),
                details=_serialise_details(entry.get("details")),
                reason=entry.get("reason"),
                is_override=bool(entry.get("is_override", False)),
            )
            db_session.add(row)
            await db_session.flush()
            audit_ids.append(str(row.id))
        await db_session.commit()
        return audit_ids

    async def get_logs(
        self,
        db_session: AsyncSession,
        filters: Optional[Dict[str, Any]] = None,
        page: int = 1,
        page_size: int = 10,
    ) -> Tuple[List[AuditLog], int]:
        filters = filters or {}
        query = select(AuditLog)
        if filters.get("action"):
            query = query.where(func.upper(AuditLog.action) == str(filters["action"]).upper())
        if filters.get("entity_type"):
            query = query.where(AuditLog.entity_type == filters["entity_type"])
        if filters.get("user_id"):
            query = query.where(AuditLog.user_id == filters["user_id"])
        if filters.get("date_from"):
            query = query.where(AuditLog.timestamp >= filters["date_from"])
        if filters.get("date_to"):
            query = query.where(AuditLog.timestamp <= filters["date_to"])

        total = (await db_session.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
        result = await db_session.execute(
            query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        return list(result.scalars().all()), int(total)
