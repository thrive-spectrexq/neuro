from typing import List, Tuple, Optional, Dict, Any
from uuid import UUID
from sqlmodel import select, func
from sqlmodel.ext.asyncio.session import AsyncSession
from fastapi import HTTPException

from app.models.note import Note, NoteLink
from app.schemas.note import NoteCreate, NoteUpdate
from app.models.tag import Tag, NoteTag
from app.models.audit import AuditLog

class NoteService:
    @staticmethod
    async def create_note(session: AsyncSession, user_id: UUID, data: NoteCreate) -> Note:
        \"\"\"Create a new note, handling tags and emitting audit log.\"\"\"
        note_dict = data.model_dump(exclude={"tags"})
        note = Note(**note_dict, user_id=user_id)
        session.add(note)
        await session.flush()
        
        if hasattr(data, "tags") and data.tags:
            from app.services.tags import tag_service
            for tag_name in data.tags:
                tag = await tag_service.get_or_create_tag(session, tag_name)
                note_tag = NoteTag(note_id=note.id, tag_id=tag.id)
                session.add(note_tag)
                
        # Emit audit log
        audit = AuditLog(
            user_id=user_id,
            project_id=note.project_id,
            action="CREATE_NOTE",
            target_type="note",
            target_id=str(note.id),
            details={"title": note.title} if hasattr(note, "title") else {}
        )
        session.add(audit)
        
        await session.commit()
        await session.refresh(note)
        return note

    @staticmethod
    async def get_note(session: AsyncSession, note_id: UUID, user_id: UUID) -> Note:
        \"\"\"Get a note with ownership check.\"\"\"
        statement = select(Note).where(Note.id == note_id)
        result = await session.execute(statement)
        note = result.scalar_one_or_none()
        
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        if note.user_id != user_id:
            raise HTTPException(status_code=403, detail="Not authorized to access this note")
            
        return note

    @staticmethod
    async def list_notes(
        session: AsyncSession, 
        user_id: UUID, 
        project_id: Optional[UUID] = None, 
        tag: Optional[str] = None, 
        is_archived: bool = False, 
        page: int = 1, 
        size: int = 20
    ) -> Tuple[List[Note], int]:
        \"\"\"Get a paginated list of notes.\"\"\"
        statement = select(Note).where(Note.user_id == user_id, Note.is_archived == is_archived)
        
        if project_id:
            statement = statement.where(Note.project_id == project_id)
            
        if tag:
            statement = statement.join(NoteTag).join(Tag).where(Tag.name == tag)
            
        count_stmt = select(func.count()).select_from(statement.subquery())
        count_result = await session.execute(count_stmt)
        total = count_result.scalar_one()
        
        statement = statement.offset((page - 1) * size).limit(size)
        result = await session.execute(statement)
        notes = list(result.scalars().all())
        
        return notes, total

    @staticmethod
    async def update_note(session: AsyncSession, note_id: UUID, user_id: UUID, data: NoteUpdate) -> Note:
        \"\"\"Partially update a note.\"\"\"
        note = await NoteService.get_note(session, note_id, user_id)
        
        update_data = data.model_dump(exclude_unset=True, exclude={"tags"})
        for key, value in update_data.items():
            setattr(note, key, value)
            
        if hasattr(data, "tags") and data.tags is not None:
            delete_tags_stmt = select(NoteTag).where(NoteTag.note_id == note.id)
            tags_result = await session.execute(delete_tags_stmt)
            for nt in tags_result.scalars().all():
                await session.delete(nt)
                
            from app.services.tags import tag_service
            for tag_name in data.tags:
                tag = await tag_service.get_or_create_tag(session, tag_name)
                note_tag = NoteTag(note_id=note.id, tag_id=tag.id)
                session.add(note_tag)
                
        # Emit audit log
        audit = AuditLog(
            user_id=user_id,
            project_id=note.project_id,
            action="UPDATE_NOTE",
            target_type="note",
            target_id=str(note.id),
            details={"updated_fields": list(update_data.keys())}
        )
        session.add(audit)
                
        session.add(note)
        await session.commit()
        await session.refresh(note)
        return note

    @staticmethod
    async def delete_note(session: AsyncSession, note_id: UUID, user_id: UUID) -> None:
        \"\"\"Delete a note (soft delete by setting is_archived or hard delete).\"\"\"
        note = await NoteService.get_note(session, note_id, user_id)
        
        # Emit audit log
        audit = AuditLog(
            user_id=user_id,
            project_id=note.project_id,
            action="DELETE_NOTE",
            target_type="note",
            target_id=str(note.id),
            details={}
        )
        session.add(audit)
        
        await session.delete(note)
        await session.commit()

    @staticmethod
    async def get_note_links(session: AsyncSession, note_id: UUID) -> Dict[str, List[NoteLink]]:
        \"\"\"Get forward links and backlinks for a note.\"\"\"
        forward_stmt = select(NoteLink).where(NoteLink.source_id == note_id)
        backward_stmt = select(NoteLink).where(NoteLink.target_id == note_id)
        
        forward_res = await session.execute(forward_stmt)
        backward_res = await session.execute(backward_stmt)
        
        return {
            "forward_links": list(forward_res.scalars().all()),
            "backlinks": list(backward_res.scalars().all())
        }

    @staticmethod
    async def link_notes(session: AsyncSession, source_id: UUID, target_id: UUID) -> NoteLink:
        \"\"\"Link two notes together.\"\"\"
        stmt = select(NoteLink).where(NoteLink.source_id == source_id, NoteLink.target_id == target_id)
        res = await session.execute(stmt)
        existing_link = res.scalar_one_or_none()
        
        if existing_link:
            return existing_link
            
        link = NoteLink(source_id=source_id, target_id=target_id)
        session.add(link)
        await session.commit()
        await session.refresh(link)
        return link

    @staticmethod
    async def unlink_notes(session: AsyncSession, source_id: UUID, target_id: UUID) -> None:
        \"\"\"Unlink two notes.\"\"\"
        stmt = select(NoteLink).where(NoteLink.source_id == source_id, NoteLink.target_id == target_id)
        res = await session.execute(stmt)
        link = res.scalar_one_or_none()
        
        if link:
            await session.delete(link)
            await session.commit()

note_service = NoteService()
