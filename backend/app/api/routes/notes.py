import re
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, func, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag
from app.models.user import User
from app.schemas.note import NoteCreate, NoteListResponse, NoteResponse, NoteUpdate
from app.services.search.engine import search_engine

router = APIRouter()

async def _update_note_links(session: AsyncSession, note_id: uuid.UUID, content: str):
    link_pattern = r'\[\[([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})\]\]'
    target_ids = re.findall(link_pattern, content)
    
    await session.execute(delete(NoteLink).where(NoteLink.source_id == note_id))
    
    for target_id_str in set(target_ids):
        target_uuid = uuid.UUID(target_id_str)
        link = NoteLink(source_id=note_id, target_id=target_uuid)
        session.add(link)

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
        
        await _update_note_links(session, note.id, note.content)
        
        await search_engine.index_note(session, note)
        
        await session.commit()
        
        tags = await _get_note_tags(session, note.id)
        response_data = note.model_dump()
        response_data["tags"] = tags
        return NoteResponse(**response_data)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": tb})

@router.get("", response_model=NoteListResponse)
async def list_notes(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    stmt = select(Note).offset(skip).limit(limit)
    result = await session.execute(stmt)
    notes = result.scalars().all()
    
    count_stmt = select(func.count()).select_from(Note)
    count_result = await session.execute(count_stmt)
    total = count_result.scalar() or 0
    
    items = []
    for note in notes:
        tags = await _get_note_tags(session, note.id)
        note_data = note.model_dump()
        note_data["tags"] = tags
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
        
    tags = await _get_note_tags(session, note.id)
    note_data = note.model_dump()
    note_data["tags"] = tags
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
        await _update_note_links(session, note.id, note.content)
        
    await search_engine.index_note(session, note)
    await session.commit()
    
    tags = await _get_note_tags(session, note.id)
    note_data = note.model_dump()
    note_data["tags"] = tags
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
        
    # Clean up relations
    await session.execute(delete(NoteTag).where(NoteTag.note_id == id))
    await session.execute(delete(NoteLink).where(NoteLink.source_id == id))
    await session.execute(delete(NoteLink).where(NoteLink.target_id == id))
        
    await search_engine.remove_note(session, id)
    
    await session.delete(note)
    await session.commit()
