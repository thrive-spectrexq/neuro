import enum
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import Enum as SAEnum
from sqlmodel import JSON, Column, Field, SQLModel


class PolicyType(str, enum.Enum):
    access = "access"
    consent = "consent"
    retention = "retention"
    audit = "audit"


class Policy(SQLModel, table=True):
    """Governance policy defining what actions/resources are permitted."""

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(index=True)
    policy_type: PolicyType = Field(sa_column=Column(SAEnum(PolicyType), nullable=False))
    resource_type: str = Field(default="*")
    rules: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    is_active: bool = Field(default=True)
    created_by: uuid.UUID | None = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ConsentRecord(SQLModel, table=True):
    __tablename__ = "consent_record"
    """Tracks explicit user consent for privacy-sensitive operations."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    policy_id: uuid.UUID = Field(foreign_key="policy.id", index=True)
    consent_given: bool = Field(default=False)
    consent_scope: str = Field(default="")
    granted_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    revoked_at: datetime | None = Field(default=None)


class GovernanceAuditEntry(SQLModel, table=True):
    __tablename__ = "governance_audit_entry"
    """Immutable audit trail for all governance-relevant actions."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    action: str = Field(index=True)
    resource_type: str = Field(default="")
    resource_id: str | None = Field(default=None)
    details: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    policy_evaluated: str | None = Field(default=None)
    decision: str = Field(default="allowed")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC), index=True)
