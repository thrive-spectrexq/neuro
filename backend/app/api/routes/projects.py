import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()

@router.post("", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = Project(**project_in.model_dump(), user_id=uuid.uuid4())
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    stmt = select(Project)
    result = await session.execute(stmt)
    return result.scalars().all()

@router.get("/{id}", response_model=ProjectResponse)
async def get_project(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project

@router.put("/{id}", response_model=ProjectResponse)
async def update_project(
    id: uuid.UUID,
    project_in: ProjectUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    update_data = project_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
        
    session.add(project)
    await session.commit()
    await session.refresh(project)
    return project

@router.delete("/{id}", status_code=204)
async def delete_project(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    await session.delete(project)
    await session.commit()
