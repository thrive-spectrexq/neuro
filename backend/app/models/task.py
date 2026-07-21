from datetime import datetime
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class TaskBase(SQLModel):
    title: str = Field(index=True)
    description: str | None = Field(default=None)
    status: str = Field(default="todo")  # "todo", "in_progress", "done"
    priority: str | None = Field(default="medium")  # "low", "medium", "high"
    due_date: datetime | None = Field(default=None)
    project_id: UUID | None = Field(default=None, foreign_key="project.id")
    user_id: UUID | None = Field(default=None, foreign_key="user.id", index=True)


class Task(TaskBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TaskCreate(TaskBase):
    pass


class TaskUpdate(SQLModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: datetime | None = None
    project_id: UUID | None = None


class TaskStatusUpdate(SQLModel):
    status: str
