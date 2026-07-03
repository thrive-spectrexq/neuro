import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func
from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note
from app.models.user import User
from app.schemas.note import NoteCreate, NoteUpdate, NoteResponse, NoteListResponse

router = APIRouter()

# Stub: In a real app we'd fetch the user by username from get_current_user
async def get_user_id() -> uuid.UUID:
    return uuid.uuid4() # Mock user id

@router.post("", response_model=NoteResponse)
async def create_note(
    note_in: NoteCreate,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    # Mocking user ID linking
    note = Note(**note_in.model_dump(), user_id=uuid.uuid4())
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note

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
    
    return NoteListResponse(items=notes, total=total, page=skip // limit + 1, size=limit)

@router.get("/{id}", response_model=NoteResponse)
async def get_note(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    return note

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
        
    update_data = note_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(note, key, value)
        
    session.add(note)
    await session.commit()
    await session.refresh(note)
    return note

@router.delete("/{id}", status_code=204)
async def delete_note(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    note = await session.get(Note, id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    await session.delete(note)
    await session.commit()
