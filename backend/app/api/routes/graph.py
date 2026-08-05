from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user
from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag
from app.models.user import User

router = APIRouter()


@router.get("")
async def get_graph(
    session: AsyncSession = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """
    Build interactive knowledge graph topology with notes, tags, and bi-directional links.
    """
    # Fetch notes for the current user
    notes_result = await session.execute(select(Note).where(Note.user_id == current_user.id))
    notes = notes_result.scalars().all()

    nodes = []
    links = []
    seen_node_ids = set()

    note_ids = set()
    for note in notes:
        node_id = str(note.id)
        if node_id not in seen_node_ids:
            nodes.append({
                "id": node_id,
                "name": note.title or "Untitled Note",
                "type": "note",
                "val": 6
            })
            seen_node_ids.add(node_id)
        note_ids.add(note.id)

    # If the user has notes, find links and tags
    if note_ids:
        note_id_list = list(note_ids)

        # Note-to-note links (ensure both source and target belong to valid notes)
        links_result = await session.execute(
            select(NoteLink).where(
                NoteLink.source_id.in_(note_id_list),
                NoteLink.target_id.in_(note_id_list)
            )
        )
        note_links = links_result.scalars().all()
        for link in note_links:
            links.append({
                "source": str(link.source_id),
                "target": str(link.target_id),
                "type": "link"
            })

        # Tags associated with these notes
        tags_result = await session.execute(
            select(NoteTag).where(NoteTag.note_id.in_(note_id_list))
        )
        note_tags = tags_result.scalars().all()

        tag_ids = list({nt.tag_id for nt in note_tags})
        if tag_ids:
            actual_tags = await session.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            for tag in actual_tags.scalars().all():
                tag_node_id = str(tag.id)
                if tag_node_id not in seen_node_ids:
                    nodes.append({
                        "id": tag_node_id,
                        "name": f"#{tag.name}",
                        "type": "tag",
                        "val": 4
                    })
                    seen_node_ids.add(tag_node_id)

            # Create links from notes to tags
            for nt in note_tags:
                source_id = str(nt.note_id)
                target_id = str(nt.tag_id)
                if source_id in seen_node_ids and target_id in seen_node_ids:
                    links.append({
                        "source": source_id,
                        "target": target_id,
                        "type": "tag"
                    })

    return {
        "nodes": nodes,
        "links": links,
        "edges": links
    }

