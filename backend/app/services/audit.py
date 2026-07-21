import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.audit import AuditLog


class AuditService:
    async def log_action(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        target_type: str,
        target_id: str,
        project_id: uuid.UUID | None = None,
        details: dict | None = None,
    ):
        log = AuditLog(
            user_id=user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            project_id=project_id,
            details=details or {},
        )
        session.add(log)
        # We do not commit here, we let the caller commit the transaction

    async def get_user_activity(self, session: AsyncSession, user_id: uuid.UUID, limit: int = 20) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.user_id == user_id).order_by(AuditLog.id.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_project_activity(
        self, session: AsyncSession, project_id: uuid.UUID, limit: int = 20
    ) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.project_id == project_id).order_by(AuditLog.id.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def export_audit_log(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        start_date=None,
        end_date=None,
        project_id: uuid.UUID | None = None,
    ) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.user_id == user_id)
        if project_id:
            stmt = stmt.where(AuditLog.project_id == project_id)
        if start_date:
            stmt = stmt.where(AuditLog.timestamp >= start_date)
        if end_date:
            stmt = stmt.where(AuditLog.timestamp <= end_date)
        stmt = stmt.order_by(AuditLog.timestamp.desc())
        result = await session.execute(stmt)
        return list(result.scalars().all())


audit_service = AuditService()


async def log_action(
    session: AsyncSession,
    user_id: uuid.UUID,
    action: str,
    target_type: str,
    target_id: str,
    project_id: uuid.UUID | None = None,
    details: dict | None = None,
):
    return await audit_service.log_action(session, user_id, action, target_type, target_id, project_id, details)
