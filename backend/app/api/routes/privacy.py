from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import delete, func, select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.comment import Comment
from app.models.memory import Memory
from app.models.note import Note, NoteLink
from app.models.project import ProjectMember
from app.models.tag import NoteTag
from app.models.task import Task
from app.models.user import User

router = APIRouter()


@router.get("/data-inventory")
async def get_data_inventory(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Return a categorical inventory of all personal data stored
    for the current user (GDPR Art. 15 Right of Access).
    """
    notes_count = await session.scalar(select(func.count(Note.id)).where(Note.user_id == current_user.id)) or 0
    tasks_count = await session.scalar(select(func.count(Task.id)).where(Task.user_id == current_user.id)) or 0
    comments_count = await session.scalar(select(func.count(Comment.id)).where(Comment.user_id == current_user.id)) or 0
    memories_count = await session.scalar(select(func.count(Memory.id)).where(Memory.user_id == current_user.id)) or 0

    return {
        "user_id": str(current_user.id),
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at.isoformat() if hasattr(current_user, "created_at") else None,
        "data_inventory": {
            "notes": notes_count,
            "tasks": tasks_count,
            "comments": comments_count,
            "memories": memories_count,
        },
        "retention_policy": "Local-first / User-owned. No data retained after account deletion.",
    }


@router.post("/data-export")
async def export_user_data(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Export all stored user data in machine-readable JSON format
    (GDPR Art. 20 Right to Data Portability).
    """
    # Notes
    notes_res = await session.execute(select(Note).where(Note.user_id == current_user.id))
    notes = [
        {
            "id": str(n.id),
            "title": n.title,
            "content": n.content,
            "content_type": n.content_type.value if hasattr(n.content_type, "value") else str(n.content_type),
            "created_at": n.created_at.isoformat(),
            "updated_at": n.updated_at.isoformat(),
            "is_archived": n.is_archived,
            "is_pinned": n.is_pinned,
        }
        for n in notes_res.scalars().all()
    ]

    # Tasks
    tasks_res = await session.execute(select(Task).where(Task.user_id == current_user.id))
    tasks = [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
            "status": str(t.status),
            "priority": str(t.priority),
            "due_date": t.due_date.isoformat() if t.due_date else None,
            "created_at": t.created_at.isoformat(),
        }
        for t in tasks_res.scalars().all()
    ]

    # Memories
    memories_res = await session.execute(select(Memory).where(Memory.user_id == current_user.id))
    memories = [
        {
            "id": str(m.id),
            "key": m.key,
            "content": m.content,
            "type": m.memory_type.value,
            "confidence": m.confidence,
            "created_at": m.created_at.isoformat(),
        }
        for m in memories_res.scalars().all()
    ]

    return {
        "exported_at": datetime.now(UTC).isoformat(),
        "format_version": "1.0",
        "user": {
            "id": str(current_user.id),
            "username": current_user.username,
            "email": current_user.email,
        },
        "notes": notes,
        "tasks": tasks,
        "memories": memories,
    }


@router.delete("/data-deletion", status_code=status.HTTP_200_OK)
async def delete_user_account_and_data(
    confirm: bool = False,
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """
    Permanently erase all personal data, memories, notes, and the user account
    (GDPR Art. 17 Right to Erasure / Right to be Forgotten).
    Requires explicit ?confirm=true parameter.
    """
    if not confirm:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="To delete all user data and account, provide the query parameter '?confirm=true'. This action is irreversible.",
        )

    user_id = current_user.id
    from app.models.sync import SyncBlob, DeviceKey
    from app.models.audit import AuditLog
    from app.models.automation import AutomationRule
    from app.models.project import Project

    await session.execute(delete(SyncBlob).where(SyncBlob.user_id == user_id))
    await session.execute(delete(DeviceKey).where(DeviceKey.user_id == user_id))
    await session.execute(delete(AuditLog).where(AuditLog.user_id == user_id))
    await session.execute(delete(Comment).where(Comment.user_id == user_id))
    await session.execute(delete(Task).where(Task.user_id == user_id))

    notes_stmt = select(Note.id).where(Note.user_id == user_id)
    user_note_ids = (await session.execute(notes_stmt)).scalars().all()
    if user_note_ids:
        await session.execute(
            delete(NoteLink).where((NoteLink.source_id.in_(user_note_ids)) | (NoteLink.target_id.in_(user_note_ids)))
        )
        await session.execute(delete(NoteTag).where(NoteTag.note_id.in_(user_note_ids)))
    await session.execute(delete(Note).where(Note.user_id == user_id))

    await session.execute(delete(ProjectMember).where(ProjectMember.user_id == user_id))
    await session.execute(delete(Project).where(Project.user_id == user_id))
    await session.execute(delete(Memory).where(Memory.user_id == user_id))
    await session.execute(delete(AutomationRule).where(AutomationRule.user_id == user_id))

    await session.execute(delete(User).where(User.id == user_id))

    await session.commit()

    return {
        "status": "success",
        "message": f"All data and account for user {current_user.username} have been permanently deleted.",
        "timestamp": datetime.now(UTC).isoformat(),
    }
