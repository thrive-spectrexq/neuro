import uuid
from datetime import UTC, datetime
from typing import Any
from sqlalchemy import JSON, Column

from sqlmodel import Field, SQLModel


class AuditLog(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", index=True)
    project_id: uuid.UUID | None = Field(default=None, foreign_key="project.id", index=True)
    action: str
    target_type: str
    target_id: str
    details: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))
