import uuid
from datetime import UTC, datetime

from sqlmodel import Field, SQLModel


class Comment(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    note_id: uuid.UUID = Field(foreign_key="note.id", index=True)
    user_id: uuid.UUID = Field(foreign_key="user.id")
    content: str
    is_resolved: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
