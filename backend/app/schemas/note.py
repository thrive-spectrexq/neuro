import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.note import ContentType


class NoteLinkInfo(BaseModel):
    id: uuid.UUID
    title: str


class NoteCreate(BaseModel):
    title: str
    content: str
    content_type: ContentType = ContentType.markdown
    is_archived: bool = False
    is_pinned: bool = False
    parent_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    tags: list[str] | None = None


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    content_type: ContentType | None = None
    is_archived: bool | None = None
    is_pinned: bool | None = None
    parent_id: uuid.UUID | None = None
    project_id: uuid.UUID | None = None
    tags: list[str] | None = None


class NoteResponse(BaseModel):
    id: uuid.UUID
    title: str
    content: str
    content_type: ContentType
    created_at: datetime
    updated_at: datetime
    is_archived: bool
    is_pinned: bool
    parent_id: uuid.UUID | None
    project_id: uuid.UUID | None
    user_id: uuid.UUID
    tags: list[str] = []
    forward_links: list[NoteLinkInfo] = []
    backlinks: list[NoteLinkInfo] = []

    model_config = ConfigDict(from_attributes=True)


class NoteListResponse(BaseModel):
    items: list[NoteResponse]
    total: int
    page: int
    size: int
