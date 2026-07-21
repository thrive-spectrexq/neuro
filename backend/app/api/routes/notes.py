import re
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, func, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project, ProjectMember, Role
from app.models.note import Note, NoteLink
from app.models.tag import Tag, NoteTag
from app.models.comment import Comment
from app.schemas.note import NoteCreate, NoteListResponse, NoteResponse, NoteUpdate
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.search.engine import search_engine
from app.services.audit import log_action

router = APIRouter()

async def _check_note_permission(session: AsyncSession, note: Note, user_id: uuid.UUID, require_edit: bool = False):
    if note.project_id is None:
        if note.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return
        
    project = await session.get(Project, note.project_id)
    if project.user_id == user_id:
        return
        
    member = await session.get(ProjectMember, (note.project_id, user_id))
    if not member:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    if require_edit and member.role == Role.viewer:
        raise HTTPException(status_code=403, detail="Viewers cannot edit notes")

async def _update_note_links(session: AsyncSession, note: Note):
    wiki_pattern = r'\[\[(.*?)\]\]'
    titles = re.findall(wiki_pattern, note.content)
    
    md_pattern = r'\[.*?\]\(([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\)'
    uuids = re.findall(md_pattern, note.content)
    
    target_ids = set([uuid.UUID(u) for u in uuids])
    
    for title in set(titles):
        stmt = select(Note).where(Note.title == title, Note.user_id == note.user_id, Note.project_id == note.project_id)
        result = await session.execute(stmt)
        target_note = result.scalar_one_or_none()
        
        if not target_note:
            target_note = Note(title=title, content="", user_id=note.user_id, project_id=note.project_id)
            session.add(target_note)
            await session.flush()
            await session.refresh(target_note)
            
        target_ids.add(target_note.id)
    
    await session.execute(delete(NoteLink).where(NoteLink.source_id == note.id))
    
    for target_id in target_ids:
        if target_id != note.id:
            link = NoteLink(source_id=note.id, target_id=target_id)
            session.add(link)

async def _get_note_links(session: AsyncSession, note_id: uuid.UUID):
    stmt_fwd = select(Note.id, Note.title).join(NoteLink, NoteLink.target_id == Note.id).where(NoteLink.source_id == note_id)
    fwd_res = await session.execute(stmt_fwd)
    forward_links = [{"id": row.id, "title": row.title} for row in fwd_res.all()]
    
    stmt_bwd = select(Note.id, Note.title).join(NoteLink, NoteLink.source_id == Note.id).where(NoteLink.target_id == note_id)
    bwd_res = await session.execute(stmt_bwd)
    backlinks = [{"id": row.id, "title": row.title} for row in bwd_res.all()]
    
    return forward_links, backlinks

async def _update_note_tags(session: AsyncSession, note_id: uuid.UUID, tags: list[str]):
    await session.execute(delete(NoteTag).where(NoteTag.note_id == note_id))
    
    if not tags:
        return
        
    for tag_name in set(tags):
        tag_name = tag_name.strip()
        if not tag_name:
            continue
            
        stmt = select(Tag).where(Tag.name == tag_name)
        result = await session.execute(stmt)
        tag = result.scalar_one_or_none()
        
        if not tag:
            tag = Tag(name=tag_name)
            session.add(tag)
            await session.flush()
            await session.refresh(tag)
            
        note_tag = NoteTag(note_id=note_id, tag_id=tag.id)
        session.add(note_tag)

async def _get_note_tags(session: AsyncSession, note_id: uuid.UUID) -> list[str]:
    stmt = select(Tag.name).join(NoteTag).where(NoteTag.note_id == note_id)
    result = await session.execute(stmt)
    return list(result.scalars().all())

@router.post("", response_model=NoteResponse)
async def create_note(
    note_in: NoteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    try:
        note_data = note_in.model_dump(exclude={"tags"})
        user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
        note = Note(**note_data, user_id=user_id)
        session.add(note)
        await session.flush()
        await session.refresh(note)
        
        if note_in.tags is not None:
            await _update_note_tags(session, note.id, note_in.tags)
        
        await _update_note_links(session, note)
        
        await search_engine.index_note(session, note)
        
        await log_action(session, user_id, "NOTE_CREATED", "Note", str(note.id), note.project_id, {"title": note.title})
        
        await session.commit()
        
        tags = await _get_note_tags(session, note.id)
        fwd, bwd = await _get_note_links(session, note.id)
        response_data = note.model_dump()
        response_data["tags"] = tags
        response_data["forward_links"] = fwd
        response_data["backlinks"] = bwd
        return NoteResponse(**response_data)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": tb})

@router.get("", response_model=NoteListResponse)
async def list_notes(
    project_id: uuid.UUID | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    stmt = select(Note)
    count_stmt = select(func.count()).select_from(Note)
    
    if project_id:
        stmt = stmt.where(Note.project_id == project_id)
        count_stmt = count_stmt.where(Note.project_id == project_id)
    else:
        stmt = stmt.where(Note.project_id == None)
        count_stmt = count_stmt.where(Note.project_id == None)
        
    stmt = stmt.offset(skip).limit(limit)
    result = await session.execute(stmt)
    notes = result.scalars().all()
    
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

@router.get("/{id}", response_model=NoteResponse)
async def get_note(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    await _check_note_permission(session, note, user_uuid)
        
    tags = await _get_note_tags(session, note.id)
    fwd, bwd = await _get_note_links(session, note.id)
    note_data = note.model_dump()
    note_data["tags"] = tags
    note_data["forward_links"] = fwd
    note_data["backlinks"] = bwd
    return NoteResponse(**note_data)

@router.put("/{id}", response_model=NoteResponse)
async def update_note(
    id: uuid.UUID,
    note_in: NoteUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    await _check_note_permission(session, note, user_uuid, require_edit=True)
        
    update_data = note_in.model_dump(exclude_unset=True, exclude={"tags"})
    if update_data:
        for key, value in update_data.items():
            setattr(note, key, value)
        note.updated_at = datetime.now(UTC)
        
    session.add(note)
    await session.flush()
    await session.refresh(note)
    
    if note_in.tags is not None:
        await _update_note_tags(session, note.id, note_in.tags)
    
    if "content" in update_data:
        await _update_note_links(session, note)
        
    await search_engine.index_note(session, note)
    
    await log_action(session, user_uuid, "NOTE_UPDATED", "Note", str(note.id), note.project_id, {"title": note.title})
    
    await session.commit()
    
    tags = await _get_note_tags(session, note.id)
    fwd, bwd = await _get_note_links(session, note.id)
    note_data = note.model_dump()
    note_data["tags"] = tags
    note_data["forward_links"] = fwd
    note_data["backlinks"] = bwd
    return NoteResponse(**note_data)

@router.delete("/{id}", status_code=204)
async def delete_note(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    await _check_note_permission(session, note, user_uuid, require_edit=True)
        
    # Clean up relations
    await session.execute(delete(NoteTag).where(NoteTag.note_id == note.id))
    await session.execute(delete(NoteLink).where(NoteLink.source_id == note.id))
    
    await log_action(session, user_uuid, "NOTE_DELETED", "Note", str(note.id), note.project_id, {"title": note.title})
    
    await session.delete(note)
    await search_engine.delete_note(note.id)
    await session.commit()

@router.post("/{id}/extract-entities", status_code=202)
async def extract_entities(id: uuid.UUID, session: AsyncSession = Depends(get_session)):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    from app.workers.tasks import extract_entities_task
    extract_entities_task.delay(str(id))
    
    return {"status": "accepted", "message": "Entity extraction started in background"}

@router.get("/{id}/comments", response_model=list[CommentResponse])
async def list_comments(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    await _check_note_permission(session, note, user_uuid)
    
    stmt = select(Comment).where(Comment.note_id == id).order_by(Comment.created_at.asc())
    result = await session.execute(stmt)
    return result.scalars().all()

@router.post("/{id}/comments", response_model=CommentResponse)
async def add_comment(
    id: uuid.UUID,
    comment_in: CommentCreate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    # Viewers CAN comment (or maybe we want only editors? usually viewers can comment). We'll allow it.
    await _check_note_permission(session, note, user_uuid)
    
    comment = Comment(
        note_id=id,
        user_id=user_uuid,
        content=comment_in.content
    )
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    
    return comment
