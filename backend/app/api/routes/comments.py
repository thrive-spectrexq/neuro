import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.comment import Comment
from app.models.note import Note
from app.api.routes.notes import _check_note_permission
from app.schemas.comment import CommentResponse

router = APIRouter()

@router.put("/{id}/resolve", response_model=CommentResponse)
async def resolve_comment(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user)
):
    comment = await session.get(Comment, id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    note = await session.get(Note, comment.note_id)
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
        
    user_uuid = uuid.UUID(current_user["id"]) if isinstance(current_user, dict) else current_user.id
    # Only Editors and Owners can resolve comments
    await _check_note_permission(session, note, user_uuid, require_edit=True)
    
    comment.is_resolved = True
    comment.updated_at = datetime.now(UTC)
    session.add(comment)
    await session.commit()
    await session.refresh(comment)
    
    return comment
