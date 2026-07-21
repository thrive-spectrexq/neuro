import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CommentCreate(BaseModel):
    content: str


class CommentUpdate(BaseModel):
    content: str | None = None
    is_resolved: bool | None = None


class CommentResponse(BaseModel):
    id: uuid.UUID
    note_id: uuid.UUID
    user_id: uuid.UUID
    content: str
    is_resolved: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
