from uuid import UUID
from typing import Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.task import Task, TaskCreate, TaskUpdate, TaskStatusUpdate
from app.models.user import User

router = APIRouter()

@router.get("", response_model=list[Task])
async def read_tasks(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve tasks.
    """
    statement = select(Task).where(Task.user_id == current_user.id).offset(skip).limit(limit)
    result = await session.execute(statement)
    tasks = result.scalars().all()
    return tasks

@router.post("", response_model=Task)
async def create_task(
    *, session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    task_in: TaskCreate
) -> Any:
    """
    Create new task.
    """
    task = Task.model_validate(task_in)
    task.user_id = current_user.id
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

@router.get("/{id}", response_model=Task)
async def read_task(
    *, session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    id: UUID
) -> Any:
    """
    Get task by ID.
    """
    task = await session.get(Task, id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{id}", response_model=Task)
async def update_task(
    *, session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    id: UUID, task_in: TaskUpdate
) -> Any:
    """
    Update a task.
    """
    task = await session.get(Task, id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
        
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

@router.patch("/{id}/status", response_model=Task)
async def update_task_status(
    *, session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    id: UUID, status_in: TaskStatusUpdate
) -> Any:
    """
    Update a task status quickly (e.g. for drag-and-drop).
    """
    task = await session.get(Task, id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = status_in.status
    task.updated_at = datetime.now(timezone.utc)
    session.add(task)
    await session.commit()
    await session.refresh(task)
    return task

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response)
async def delete_task(
    *, session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
    id: UUID
) -> None:
    """
    Delete a task.
    """
    task = await session.get(Task, id)
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Task not found")
    await session.delete(task)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
