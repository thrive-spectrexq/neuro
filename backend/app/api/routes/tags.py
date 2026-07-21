import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, func

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note
from app.models.tag import NoteTag, Tag
from app.models.user import User
from app.schemas.tag import TagCreate, TagResponse

router = APIRouter()


@router.get("", response_model=List[TagResponse])
async def list_tags(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    # Fetch all tags with note count
    tags_result = await session.execute(select(Tag).order_by(Tag.name.asc()))
    tags = tags_result.scalars().all()

    response = []
    for tag in tags:
        count_res = await session.execute(
            select(func.count(NoteTag.note_id)).where(NoteTag.tag_id == tag.id)
        )
        count = count_res.scalar() or 0
        response.append(TagResponse(id=tag.id, name=tag.name, note_count=count))

    return response


@router.post("", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_in: TagCreate,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    normalized_name = tag_in.name.strip().lower()
    existing_res = await session.execute(select(Tag).where(Tag.name == normalized_name))
    existing = existing_res.scalars().first()
    if existing:
        return TagResponse(id=existing.id, name=existing.name, note_count=0)

    tag = Tag(name=normalized_name)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return TagResponse(id=tag.id, name=tag.name, note_count=0)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tag = await session.get(Tag, id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Remove note-tag links
    note_tags_res = await session.execute(select(NoteTag).where(NoteTag.tag_id == id))
    for nt in note_tags_res.scalars().all():
        await session.delete(nt)

    await session.delete(tag)
    await session.commit()
    return None


@router.get("/{id}/notes")
async def get_notes_by_tag(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    tag = await session.get(Tag, id)
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    user_id = current_user.id if hasattr(current_user, 'id') else current_user.get("id")
    stmt = (
        select(Note)
        .join(NoteTag, NoteTag.note_id == Note.id)
        .where(NoteTag.tag_id == id, Note.user_id == user_id, Note.is_archived == False)
    )
    result = await session.execute(stmt)
    notes = result.scalars().all()
    return [{"id": str(n.id), "title": n.title, "updated_at": n.updated_at} for n in notes]
