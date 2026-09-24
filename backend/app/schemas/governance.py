import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class PolicyCreate(BaseModel):
    name: str
    policy_type: str
    resource_type: str = "*"
    rules: dict[str, Any] = Field(default_factory=dict)
    is_active: bool = True


class PolicyUpdate(BaseModel):
    name: str | None = None
    rules: dict[str, Any] | None = None
    is_active: bool | None = None


class PolicyResponse(BaseModel):
    id: uuid.UUID
    name: str
    policy_type: str
    resource_type: str
    rules: dict[str, Any]
    is_active: bool
    created_by: uuid.UUID | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConsentCreate(BaseModel):
    policy_id: uuid.UUID
    consent_given: bool
    consent_scope: str


class ConsentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    policy_id: uuid.UUID
    consent_given: bool
    consent_scope: str
    granted_at: datetime
    revoked_at: datetime | None

    model_config = {"from_attributes": True}


class AuditEntryResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    action: str
    resource_type: str
    resource_id: str | None
    details: dict[str, Any]
    policy_evaluated: str | None
    decision: str
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditExportResponse(BaseModel):
    exported_at: str
    total_entries: int
    entries: list[AuditEntryResponse]
