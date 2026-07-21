import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class AutomationRuleCreate(BaseModel):
    name: str
    description: str | None = None
    trigger_type: str
    conditions: dict[str, Any] = {}
    actions: list[dict[str, Any]] = []
    is_active: bool = True


class AutomationRuleUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    trigger_type: str | None = None
    conditions: dict[str, Any] | None = None
    actions: list[dict[str, Any]] | None = None
    is_active: bool | None = None


class AutomationRuleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None = None
    trigger_type: str
    conditions: dict[str, Any]
    actions: list[dict[str, Any]]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AutomationTestRequest(BaseModel):
    trigger_type: str
    conditions: dict[str, Any] = {}
    actions: list[dict[str, Any]] = []
    sample_payload: dict[str, Any] = {}


class AutomationTestResponse(BaseModel):
    matched: bool
    simulated_actions: list[dict[str, Any]]
    message: str
