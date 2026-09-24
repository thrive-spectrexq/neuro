import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ToolCreate(BaseModel):
    name: str
    description: str = ""
    category: str = "custom"
    parameters_schema: dict[str, Any] = Field(default_factory=dict)
    handler_type: str = "builtin"
    handler_config: dict[str, Any] = Field(default_factory=dict)
    requires_consent: bool = False


class ToolUpdate(BaseModel):
    description: str | None = None
    parameters_schema: dict[str, Any] | None = None
    handler_config: dict[str, Any] | None = None
    requires_consent: bool | None = None
    is_active: bool | None = None


class ToolResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str
    category: str
    parameters_schema: dict[str, Any]
    handler_type: str
    handler_config: dict[str, Any]
    requires_consent: bool
    is_active: bool
    user_id: uuid.UUID | None
    created_at: datetime
    model_config = {"from_attributes": True}


class ToolCategoryResponse(BaseModel):
    categories: list[str]
