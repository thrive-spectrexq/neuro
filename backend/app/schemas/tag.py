import uuid

from pydantic import BaseModel, ConfigDict


class TagCreate(BaseModel):
    name: str


class TagResponse(BaseModel):
    id: uuid.UUID
    name: str
    note_count: int = 0

    model_config = ConfigDict(from_attributes=True)
