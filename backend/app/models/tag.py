import uuid

from sqlmodel import Field, SQLModel


class NoteTag(SQLModel, table=True):
    note_id: uuid.UUID = Field(foreign_key="note.id", primary_key=True)
    tag_id: uuid.UUID = Field(foreign_key="tag.id", primary_key=True)


class Tag(SQLModel, table=True):
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    name: str = Field(unique=True, index=True)
