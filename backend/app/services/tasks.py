from typing import List, Optional
from uuid import UUID
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.models.task import Task, TaskCreate, TaskUpdate
from app.models.audit import AuditLog

class TaskService:
    @staticmethod
    async def create_task(session: AsyncSession, data: TaskCreate, user_id: UUID) -> Task:
        task = Task(**data.model_dump())
        session.add(task)
        await session.flush()
        
        audit = AuditLog(
            user_id=user_id,
            project_id=task.project_id,
            action="CREATE_TASK",
            target_type="task",
            target_id=str(task.id),
            details={"title": task.title} if hasattr(task, "title") else {}
        )
        session.add(audit)
        
        await session.commit()
        await session.refresh(task)
        return task

    @staticmethod
    async def get_task(session: AsyncSession, task_id: UUID) -> Task:
        stmt = select(Task).where(Task.id == task_id)
        res = await session.execute(stmt)
        task = res.scalar_one_or_none()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return task

    @staticmethod
    async def list_tasks(session: AsyncSession, project_id: Optional[UUID] = None, status: Optional[str] = None) -> List[Task]:
        stmt = select(Task)
        
        if project_id:
            stmt = stmt.where(Task.project_id == project_id)
        if status:
            stmt = stmt.where(Task.status == status)
            
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def update_task(session: AsyncSession, task_id: UUID, data: TaskUpdate, user_id: UUID) -> Task:
        task = await TaskService.get_task(session, task_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(task, key, value)
            
        audit = AuditLog(
            user_id=user_id,
            project_id=task.project_id,
            action="UPDATE_TASK",
            target_type="task",
            target_id=str(task.id),
            details={"updated_fields": list(update_data.keys())}
        )
        session.add(audit)
            
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return task

    @staticmethod
    async def update_task_status(session: AsyncSession, task_id: UUID, status: str, user_id: UUID) -> Task:
        task = await TaskService.get_task(session, task_id)
        task.status = status
        
        audit = AuditLog(
            user_id=user_id,
            project_id=task.project_id,
            action="UPDATE_TASK_STATUS",
            target_type="task",
            target_id=str(task.id),
            details={"new_status": status}
        )
        session.add(audit)
        
        session.add(task)
        await session.commit()
        await session.refresh(task)
        return task

    @staticmethod
    async def delete_task(session: AsyncSession, task_id: UUID, user_id: UUID) -> None:
        task = await TaskService.get_task(session, task_id)
        
        audit = AuditLog(
            user_id=user_id,
            project_id=task.project_id,
            action="DELETE_TASK",
            target_type="task",
            target_id=str(task.id),
            details={}
        )
        session.add(audit)
        
        await session.delete(task)
        await session.commit()

task_service = TaskService()
