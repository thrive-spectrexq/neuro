import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.project import Role


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    created_at: datetime
    updated_at: datetime
    user_id: uuid.UUID

    model_config = ConfigDict(from_attributes=True)


class ProjectMemberCreate(BaseModel):
    user_id: uuid.UUID
    role: Role


class ProjectMemberResponse(BaseModel):
    project_id: uuid.UUID
    user_id: uuid.UUID
    role: Role
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
