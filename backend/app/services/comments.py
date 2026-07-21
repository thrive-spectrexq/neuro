from uuid import UUID

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.audit import AuditLog
from app.models.comment import Comment


class CommentService:
    @staticmethod
    async def create_comment(session: AsyncSession, note_id: UUID, user_id: UUID, content: str) -> Comment:
        comment = Comment(note_id=note_id, user_id=user_id, content=content)
        session.add(comment)
        await session.flush()

        audit = AuditLog(
            user_id=user_id,
            action="CREATE_COMMENT",
            target_type="comment",
            target_id=str(comment.id),
            details={},
        )
        session.add(audit)

        await session.commit()
        await session.refresh(comment)
        return comment

    @staticmethod
    async def list_comments(session: AsyncSession, note_id: UUID) -> list[Comment]:
        stmt = select(Comment).where(Comment.note_id == note_id).order_by(Comment.created_at.asc())
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def resolve_comment(session: AsyncSession, comment_id: UUID, user_id: UUID) -> Comment:
        stmt = select(Comment).where(Comment.id == comment_id)
        res = await session.execute(stmt)
        comment = res.scalar_one_or_none()

        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        comment.is_resolved = True
        session.add(comment)

        audit = AuditLog(
            user_id=user_id,
            action="RESOLVE_COMMENT",
            target_type="comment",
            target_id=str(comment.id),
            details={},
        )
        session.add(audit)

        await session.commit()
        await session.refresh(comment)
        return comment

    @staticmethod
    async def delete_comment(session: AsyncSession, comment_id: UUID, user_id: UUID) -> None:
        stmt = select(Comment).where(Comment.id == comment_id)
        res = await session.execute(stmt)
        comment = res.scalar_one_or_none()

        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")

        if comment.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

        audit = AuditLog(
            user_id=user_id,
            action="DELETE_COMMENT",
            target_type="comment",
            target_id=str(comment.id),
            details={},
        )
        session.add(audit)

        await session.delete(comment)
        await session.commit()


comment_service = CommentService()
