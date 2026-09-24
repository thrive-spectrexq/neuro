import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.governance import ConsentRecord, GovernanceAuditEntry, Policy, PolicyType
from app.models.user import User
from app.schemas.governance import (
    AuditEntryResponse,
    AuditExportResponse,
    ConsentCreate,
    ConsentResponse,
    PolicyCreate,
    PolicyResponse,
    PolicyUpdate,
)
from app.services.governance.engine import governance_engine

router = APIRouter()


@router.get("/policies", response_model=list[PolicyResponse])
async def list_policies(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[Policy]:
    """List all active governance policies."""
    stmt = select(Policy).where(Policy.is_active)
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("/policies", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_policy(
    payload: PolicyCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Policy:
    """Create a new governance policy."""
    try:
        policy_type_enum = PolicyType(payload.policy_type)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid policy_type: {payload.policy_type}",
        )

    policy = Policy(
        name=payload.name,
        policy_type=policy_type_enum,
        resource_type=payload.resource_type,
        rules=payload.rules,
        is_active=payload.is_active,
        created_by=current_user.id,
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )
    session.add(policy)
    await session.commit()
    await session.refresh(policy)
    return policy


@router.put("/policies/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: uuid.UUID,
    payload: PolicyUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> Policy:
    """Update a governance policy."""
    stmt = select(Policy).where(Policy.id == policy_id)
    result = await session.execute(stmt)
    policy = result.scalars().first()
    if not policy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Policy not found")

    if payload.name is not None:
        policy.name = payload.name
    if payload.rules is not None:
        policy.rules = payload.rules
    if payload.is_active is not None:
        policy.is_active = payload.is_active
    policy.updated_at = datetime.now(UTC)

    session.add(policy)
    await session.commit()
    await session.refresh(policy)
    return policy


@router.get("/consent", response_model=list[ConsentResponse])
async def list_user_consents(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[ConsentRecord]:
    """Get active and historical consent records for the current user."""
    stmt = select(ConsentRecord).where(ConsentRecord.user_id == current_user.id)
    result = await session.execute(stmt)
    return list(result.scalars().all())


@router.post("/consent", response_model=ConsentResponse)
async def update_consent(
    payload: ConsentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> ConsentRecord:
    """Grant or revoke user consent for a specific policy/scope."""
    if payload.consent_given:
        record = await governance_engine.grant_consent(
            session=session,
            user_id=current_user.id,
            policy_id=payload.policy_id,
            consent_scope=payload.consent_scope,
        )
        return record
    else:
        await governance_engine.revoke_consent(
            session=session,
            user_id=current_user.id,
            consent_scope=payload.consent_scope,
        )
        # Return record or find it
        stmt = (
            select(ConsentRecord)
            .where(
                ConsentRecord.user_id == current_user.id,
                ConsentRecord.consent_scope == payload.consent_scope,
            )
            .order_by(ConsentRecord.granted_at.desc())
        )
        result = await session.execute(stmt)
        record = result.scalars().first()
        if not record:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Consent record not found")
        return record


@router.get("/audit", response_model=list[AuditEntryResponse])
async def get_audit_trail(
    resource_type: str | None = Query(None),
    action: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> list[GovernanceAuditEntry]:
    """Query the governance audit trail for the authenticated user."""
    return await governance_engine.get_audit_trail(
        session=session,
        user_id=current_user.id,
        resource_type=resource_type,
        action=action,
        limit=limit,
        offset=offset,
    )


@router.get("/audit/export", response_model=AuditExportResponse)
async def export_audit_report(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Export complete governance and compliance audit report."""
    return await governance_engine.export_governance_report(session=session, user_id=current_user.id)
