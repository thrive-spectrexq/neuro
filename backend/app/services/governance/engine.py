import logging
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.governance import ConsentRecord, GovernanceAuditEntry, Policy, PolicyType

logger = logging.getLogger("neuro.governance")


class PolicyDecision:
    def __init__(self, allowed: bool, reason: str = "", policy_name: str | None = None):
        self.allowed = allowed
        self.reason = reason
        self.policy_name = policy_name


class GovernanceEngine:
    """Evaluates policies, enforces consent, and writes audit entries."""

    async def check_permission(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
    ) -> PolicyDecision:
        stmt = select(Policy).where(
            Policy.is_active == True,
            Policy.resource_type.in_([resource_type, "*"]),
        )
        result = await session.execute(stmt)
        policies = result.scalars().all()

        for policy in policies:
            if policy.policy_type == PolicyType.consent:
                has_consent = await self._check_consent(session, user_id, policy.id)
                if not has_consent and policy.rules.get("requires_consent", False):
                    logger.info(f"Governance denied: user={user_id} action={action} policy={policy.name}")
                    return PolicyDecision(
                        allowed=False,
                        reason=f"Consent required for '{policy.name}'",
                        policy_name=policy.name,
                    )

            if policy.policy_type == PolicyType.access:
                default = policy.rules.get("default", "allow")
                if default == "deny":
                    return PolicyDecision(
                        allowed=False,
                        reason=f"Access denied by policy '{policy.name}'",
                        policy_name=policy.name,
                    )

        return PolicyDecision(allowed=True, reason="No blocking policy")

    async def require_consent(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        consent_scope: str,
    ) -> bool:
        stmt = select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.consent_scope == consent_scope,
            ConsentRecord.consent_given == True,
            ConsentRecord.revoked_at == None,
        )
        result = await session.execute(stmt)
        record = result.scalars().first()
        return record is not None

    async def grant_consent(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        policy_id: uuid.UUID,
        consent_scope: str,
    ) -> ConsentRecord:
        record = ConsentRecord(
            user_id=user_id,
            policy_id=policy_id,
            consent_given=True,
            consent_scope=consent_scope,
            granted_at=datetime.now(UTC),
        )
        session.add(record)
        await session.commit()
        await session.refresh(record)
        logger.info(f"Consent granted: user={user_id} scope={consent_scope}")
        return record

    async def revoke_consent(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        consent_scope: str,
    ) -> bool:
        stmt = select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.consent_scope == consent_scope,
            ConsentRecord.consent_given == True,
            ConsentRecord.revoked_at == None,
        )
        result = await session.execute(stmt)
        record = result.scalars().first()
        if record:
            record.consent_given = False
            record.revoked_at = datetime.now(UTC)
            session.add(record)
            await session.commit()
            logger.info(f"Consent revoked: user={user_id} scope={consent_scope}")
            return True
        return False

    async def record_action(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        action: str,
        resource_type: str,
        details: dict[str, Any] | None = None,
        resource_id: str | None = None,
        policy_evaluated: str | None = None,
        decision: str = "allowed",
    ) -> GovernanceAuditEntry:
        entry = GovernanceAuditEntry(
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            details=details or {},
            policy_evaluated=policy_evaluated,
            decision=decision,
            timestamp=datetime.now(UTC),
        )
        session.add(entry)
        await session.commit()
        await session.refresh(entry)
        return entry

    async def get_audit_trail(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        resource_type: str | None = None,
        action: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[GovernanceAuditEntry]:
        stmt = select(GovernanceAuditEntry).where(
            GovernanceAuditEntry.user_id == user_id
        )
        if resource_type:
            stmt = stmt.where(GovernanceAuditEntry.resource_type == resource_type)
        if action:
            stmt = stmt.where(GovernanceAuditEntry.action == action)
        stmt = stmt.order_by(GovernanceAuditEntry.timestamp.desc()).offset(offset).limit(limit)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    async def export_governance_report(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
    ) -> dict[str, Any]:
        entries = await self.get_audit_trail(session, user_id, limit=10000)
        consent_stmt = select(ConsentRecord).where(ConsentRecord.user_id == user_id)
        consent_result = await session.execute(consent_stmt)
        consents = consent_result.scalars().all()

        return {
            "exported_at": datetime.now(UTC).isoformat(),
            "user_id": str(user_id),
            "total_audit_entries": len(entries),
            "audit_entries": [
                {
                    "action": e.action,
                    "resource_type": e.resource_type,
                    "decision": e.decision,
                    "timestamp": e.timestamp.isoformat(),
                }
                for e in entries
            ],
            "consent_records": [
                {
                    "scope": c.consent_scope,
                    "given": c.consent_given,
                    "granted_at": c.granted_at.isoformat(),
                    "revoked_at": c.revoked_at.isoformat() if c.revoked_at else None,
                }
                for c in consents
            ],
        }

    async def _check_consent(
        self,
        session: AsyncSession,
        user_id: uuid.UUID,
        policy_id: uuid.UUID,
    ) -> bool:
        stmt = select(ConsentRecord).where(
            ConsentRecord.user_id == user_id,
            ConsentRecord.policy_id == policy_id,
            ConsentRecord.consent_given == True,
            ConsentRecord.revoked_at == None,
        )
        result = await session.execute(stmt)
        return result.scalars().first() is not None


governance_engine = GovernanceEngine()
