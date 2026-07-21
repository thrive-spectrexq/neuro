from typing import Optional
from datetime import datetime
from sqlmodel import Field, SQLModel
from uuid import UUID, uuid4

class TaskBase(SQLModel):
    title: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    status: str = Field(default="todo")  # "todo", "in_progress", "done"
    priority: Optional[str] = Field(default="medium") # "low", "medium", "high"
    due_date: Optional[datetime] = Field(default=None)
    project_id: Optional[UUID] = Field(default=None, foreign_key="project.id")
    user_id: Optional[UUID] = Field(default=None, foreign_key="user.id", index=True)

class Task(TaskBase, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class TaskCreate(TaskBase):
    pass

class TaskUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    project_id: Optional[UUID] = None

class TaskStatusUpdate(SQLModel):
    status: str
