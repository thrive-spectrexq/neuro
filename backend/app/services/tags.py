from uuid import UUID

from fastapi import HTTPException
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.tag import NoteTag, Tag


class TagService:
    @staticmethod
    async def create_tag(session: AsyncSession, name: str) -> Tag:
        """Create a new tag."""
        tag = Tag(name=name)
        session.add(tag)
        await session.commit()
        await session.refresh(tag)
        return tag

    @staticmethod
    async def get_or_create_tag(session: AsyncSession, name: str) -> Tag:
        """Get an existing tag by name or create a new one."""
        stmt = select(Tag).where(Tag.name == name)
        res = await session.execute(stmt)
        tag = res.scalar_one_or_none()

        if tag:
            return tag

        return await TagService.create_tag(session, name)

    @staticmethod
    async def list_tags(session: AsyncSession) -> list[Tag]:
        """List all available tags."""
        stmt = select(Tag)
        res = await session.execute(stmt)
        return list(res.scalars().all())

    @staticmethod
    async def delete_tag(session: AsyncSession, tag_id: UUID) -> None:
        """Delete a tag entirely."""
        stmt = select(Tag).where(Tag.id == tag_id)
        res = await session.execute(stmt)
        tag = res.scalar_one_or_none()

        if not tag:
            raise HTTPException(status_code=404, detail="Tag not found")

        await session.delete(tag)
        await session.commit()

    @staticmethod
    async def add_tag_to_note(session: AsyncSession, note_id: UUID, tag_id: UUID) -> NoteTag:
        """Associate a tag with a note."""
        stmt = select(NoteTag).where(NoteTag.note_id == note_id, NoteTag.tag_id == tag_id)
        res = await session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            return existing

        note_tag = NoteTag(note_id=note_id, tag_id=tag_id)
        session.add(note_tag)
        await session.commit()
        await session.refresh(note_tag)
        return note_tag

    @staticmethod
    async def remove_tag_from_note(session: AsyncSession, note_id: UUID, tag_id: UUID) -> None:
        """Remove a tag association from a note."""
        stmt = select(NoteTag).where(NoteTag.note_id == note_id, NoteTag.tag_id == tag_id)
        res = await session.execute(stmt)
        note_tag = res.scalar_one_or_none()

        if note_tag:
            await session.delete(note_tag)
            await session.commit()

    @staticmethod
    async def get_tags_for_note(session: AsyncSession, note_id: UUID) -> list[Tag]:
        """Get all tags associated with a specific note."""
        stmt = select(Tag).join(NoteTag).where(NoteTag.note_id == note_id)
        res = await session.execute(stmt)
        return list(res.scalars().all())


tag_service = TagService()
