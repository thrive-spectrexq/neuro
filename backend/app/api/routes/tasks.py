from uuid import UUID
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.api.deps import get_session
from app.models.task import Task, TaskCreate, TaskUpdate, TaskStatusUpdate

router = APIRouter()

@router.get("/", response_model=list[Task])
def read_tasks(
    session: Session = Depends(get_session), skip: int = 0, limit: int = 100
) -> Any:
    """
    Retrieve tasks.
    """
    statement = select(Task).offset(skip).limit(limit)
    tasks = session.exec(statement).all()
    return tasks

@router.post("/", response_model=Task)
def create_task(
    *, session: Session = Depends(get_session), task_in: TaskCreate
) -> Any:
    """
    Create new task.
    """
    task = Task.model_validate(task_in)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.get("/{id}", response_model=Task)
def read_task(*, session: Session = Depends(get_session), id: UUID) -> Any:
    """
    Get task by ID.
    """
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.put("/{id}", response_model=Task)
def update_task(
    *, session: Session = Depends(get_session), id: UUID, task_in: TaskUpdate
) -> Any:
    """
    Update a task.
    """
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)
        
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.patch("/{id}/status", response_model=Task)
def update_task_status(
    *, session: Session = Depends(get_session), id: UUID, status_in: TaskStatusUpdate
) -> Any:
    """
    Update a task status quickly (e.g. for drag-and-drop).
    """
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    task.status = status_in.status
    session.add(task)
    session.commit()
    session.refresh(task)
    return task

@router.delete("/{id}")
def delete_task(*, session: Session = Depends(get_session), id: UUID) -> Any:
    """
    Delete a task.
    """
    task = session.get(Task, id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    session.delete(task)
    session.commit()
    return {"ok": True}
