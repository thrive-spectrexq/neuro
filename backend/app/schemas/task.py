import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TaskCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="The title of the task",
        examples=["Write documentation"],
    )
    description: str | None = Field(
        default=None,
        description="Detailed description of the task",
        examples=["Draft the API docs for the new endpoints"],
    )
    status: str = Field(
        default="todo",
        description="Status of the task: todo, in_progress, done",
        examples=["todo"],
    )
    priority: str | None = Field(
        default="medium",
        description="Priority of the task: low, medium, high",
        examples=["high"],
    )
    due_date: datetime | None = Field(
        default=None,
        description="When the task is due",
        examples=["2026-08-01T12:00:00Z"],
    )
    project_id: uuid.UUID | None = Field(default=None, description="Optional project this task belongs to")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_lower = v.lower()
        if v_lower not in ("todo", "in_progress", "done"):
            raise ValueError("status must be one of: todo, in_progress, done")
        return v_lower

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str | None) -> str | None:
        if v is not None:
            v_lower = v.lower()
            if v_lower not in ("low", "medium", "high"):
                raise ValueError("priority must be one of: low, medium, high")
            return v_lower
        return v


class TaskUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None)
    status: str | None = Field(default=None)
    priority: str | None = Field(default=None)
    due_date: datetime | None = Field(default=None)
    project_id: uuid.UUID | None = Field(default=None)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str | None) -> str | None:
        if v is not None:
            v_lower = v.lower()
            if v_lower not in ("todo", "in_progress", "done"):
                raise ValueError("status must be one of: todo, in_progress, done")
            return v_lower
        return v

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str | None) -> str | None:
        if v is not None:
            v_lower = v.lower()
            if v_lower not in ("low", "medium", "high"):
                raise ValueError("priority must be one of: low, medium, high")
            return v_lower
        return v


class TaskStatusUpdate(BaseModel):
    status: str = Field(..., description="Status of the task: todo, in_progress, done")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        v_lower = v.lower()
        if v_lower not in ("todo", "in_progress", "done"):
            raise ValueError("status must be one of: todo, in_progress, done")
        return v_lower


class TaskResponse(BaseModel):
    id: uuid.UUID = Field(..., description="Unique task ID")
    title: str = Field(..., description="The title of the task")
    description: str | None = Field(..., description="Detailed description")
    status: str = Field(..., description="Current status")
    priority: str | None = Field(..., description="Task priority")
    due_date: datetime | None = Field(..., description="When the task is due")
    project_id: uuid.UUID | None = Field(..., description="Associated project ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class TaskListResponse(BaseModel):
    items: list[TaskResponse] = Field(..., description="List of tasks")
    total: int = Field(..., description="Total number of matching tasks")
