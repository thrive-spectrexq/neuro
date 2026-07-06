import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog

async def log_action(
    session: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    target_type: str,
    target_id: str,
    project_id: uuid.UUID | None = None,
    details: dict | None = None
):
    log = AuditLog(
        user_id=user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        project_id=project_id,
        details=details or {}
    )
    session.add(log)
    # We do not commit here, we let the caller commit the transaction
