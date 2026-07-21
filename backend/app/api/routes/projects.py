import uuid

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, or_

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.project import Project, ProjectMember
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate, ProjectMemberCreate, ProjectMemberResponse
from app.schemas.note import NoteListResponse, NoteResponse
from app.api.routes.notes import _get_note_tags, _get_note_links
from app.services.audit import log_action
from app.schemas.audit import AuditLogResponse
from app.models.audit import AuditLog

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
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    
    # Select projects where user is owner or a member
    stmt = (
        select(Project)
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .where(
            or_(
                Project.user_id == user_uuid,
                ProjectMember.user_id == user_uuid
            )
        )
    )
    result = await session.execute(stmt)
    # Use distinct to avoid duplicates if someone is owner and member
    return result.scalars().unique().all()

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

@router.delete("/{id}", status_code=204, response_class=Response)
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

@router.get("/{id}/notes", response_model=NoteListResponse)
async def list_project_notes(
    id: uuid.UUID,
    skip: int = 0,
    limit: int = 20,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    stmt = select(Note).where(Note.project_id == id).offset(skip).limit(limit)
    result = await session.execute(stmt)
    notes = result.scalars().all()
    
    count_stmt = select(func.count()).select_from(Note).where(Note.project_id == id)
    count_result = await session.execute(count_stmt)
    total = count_result.scalar() or 0
    
    items = []
    for note in notes:
        tags = await _get_note_tags(session, note.id)
        fwd, bwd = await _get_note_links(session, note.id)
        note_data = note.model_dump()
        note_data["tags"] = tags
        note_data["forward_links"] = fwd
        note_data["backlinks"] = bwd
        items.append(NoteResponse(**note_data))
        
    return NoteListResponse(items=items, total=total, page=skip // limit + 1, size=limit)

@router.post("/{id}/members", response_model=ProjectMemberResponse)
async def add_member(
    id: uuid.UUID,
    member_in: ProjectMemberCreate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    # Check if user is owner
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if project.user_id != user_uuid:
        raise HTTPException(status_code=403, detail="Not authorized to add members")
        
    member = ProjectMember(project_id=id, user_id=member_in.user_id, role=member_in.role)
    session.add(member)
    
    await log_action(session, user_uuid, "MEMBER_ADDED", "ProjectMember", str(member_in.user_id), id, {"role": member_in.role})
    
    await session.commit()
    await session.refresh(member)
    
    return member

@router.delete("/{id}/members/{user_id}", status_code=204, response_class=Response)
async def remove_member(
    id: uuid.UUID,
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    curr_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    if project.user_id != curr_uuid and curr_uuid != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to remove members")
        
    member = await session.get(ProjectMember, (id, user_id))
    if member:
        await session.delete(member)
        await log_action(session, curr_uuid, "MEMBER_REMOVED", "ProjectMember", str(user_id), id)
        await session.commit()

@router.get("/{id}/audit", response_model=list[AuditLogResponse])
async def get_project_audit_log(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    project = await session.get(Project, id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    
    if project.user_id != user_uuid:
        member = await session.get(ProjectMember, (id, user_uuid))
        if not member or member.role == Role.viewer:
            raise HTTPException(status_code=403, detail="Not authorized to view audit logs")
            
    stmt = select(AuditLog).where(AuditLog.project_id == id).order_by(AuditLog.timestamp.desc())
    result = await session.execute(stmt)
    return result.scalars().all()
