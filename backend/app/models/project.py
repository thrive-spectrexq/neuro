import uuid
from datetime import UTC, datetime
from enum import Enum

from sqlmodel import Field, SQLModel


class Project(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str
    description: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    user_id: uuid.UUID = Field(foreign_key="user.id")


class Role(str, Enum):
    owner = "owner"
    editor = "editor"
    viewer = "viewer"


class ProjectMember(SQLModel, table=True):
    project_id: uuid.UUID = Field(foreign_key="project.id", primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="user.id", primary_key=True)
    role: Role = Field(default=Role.viewer)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
