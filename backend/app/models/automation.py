import uuid
from datetime import UTC, datetime
from typing import Any

from sqlmodel import JSON, Column, Field, SQLModel


class AutomationRule(SQLModel, table=True):
    __tablename__ = "automation_rule"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: str | None = None
    trigger_type: str  # e.g. on_note_created, on_tag_added
    conditions: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    actions: list[dict[str, Any]] = Field(default_factory=list, sa_column=Column(JSON))
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
