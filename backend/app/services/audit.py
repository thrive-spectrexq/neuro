import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, desc
from app.models.audit import AuditLog

class AuditService:
    async def log_action(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        target_type: str,
        target_id: str,
        details: dict | None = None,
        project_id: uuid.UUID | None = None
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

    async def get_user_activity(self, session: AsyncSession, user_id: uuid.UUID, limit: int = 20) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.user_id == user_id).order_by(AuditLog.id.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def get_project_activity(self, session: AsyncSession, project_id: uuid.UUID, limit: int = 20) -> list[AuditLog]:
        stmt = select(AuditLog).where(AuditLog.project_id == project_id).order_by(AuditLog.id.desc()).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def export_audit_log(self, session: AsyncSession, user_id: uuid.UUID, start_date, end_date) -> list[AuditLog]:
        stmt = select(AuditLog).where(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= start_date,
            AuditLog.created_at <= end_date
        ).order_by(AuditLog.created_at.desc())
        result = await session.execute(stmt)
        return list(result.scalars().all())

audit_service = AuditService()
