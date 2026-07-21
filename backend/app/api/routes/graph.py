from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag

router = APIRouter()


@router.get("")
async def get_graph(
    session: AsyncSession = Depends(get_session),
    current_user: str = Depends(get_current_user),
):
    # Fetch notes for the current user
    notes_result = await session.execute(select(Note).where(Note.user_id == current_user.id))
    notes = notes_result.scalars().all()

    # We will build nodes out of notes and tags
    nodes = []
    links = []

    note_ids = []
    for note in notes:
        nodes.append({"id": str(note.id), "name": note.title, "type": "note"})
        note_ids.append(note.id)

    # If the user has notes, find links between them
    if note_ids:
        # Note-to-note links
        links_result = await session.execute(
            select(NoteLink).where(NoteLink.source_id.in_(note_ids) | NoteLink.target_id.in_(note_ids))
        )
        note_links = links_result.scalars().all()
        for link in note_links:
            links.append({"source": str(link.source_id), "target": str(link.target_id)})

        # Tags associated with these notes
        tags_result = await session.execute(select(NoteTag).where(NoteTag.note_id.in_(note_ids)))
        note_tags = tags_result.scalars().all()

        # We need to fetch the actual tags to get their names
        tag_ids = [nt.tag_id for nt in note_tags]
        if tag_ids:
            actual_tags = await session.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            for tag in actual_tags.scalars().all():
                nodes.append({"id": str(tag.id), "name": tag.name, "type": "tag"})

            # Create links from notes to tags
            for nt in note_tags:
                links.append({"source": str(nt.note_id), "target": str(nt.tag_id)})

    return {"nodes": nodes, "links": links}
