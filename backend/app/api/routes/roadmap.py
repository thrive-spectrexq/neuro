from __future__ import annotations

import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_session
from app.core.security import get_current_user_optional
from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag
from app.models.user import User
from app.services.roadmap_service import (
    PrerequisitePathResult,
    RoadmapGraph,
    RoadmapService,
    TopicQuiz,
)

logger = logging.getLogger(__name__)
router = APIRouter()


class GenerateRoadmapRequest(BaseModel):
    goal: str = Field(..., min_length=2, description="Learning goal or subject")
    depth: str = Field(default="intermediate", description="beginner, intermediate, advanced")


class MaterializeRoadmapRequest(BaseModel):
    subject: str
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


class PathAnalysisRequest(BaseModel):
    target_id: str
    nodes: list[dict[str, Any]] | None = None
    edges: list[dict[str, Any]] | None = None


class QuizRequest(BaseModel):
    topic_id: str
    topic_title: str


@router.post("/generate", response_model=RoadmapGraph)
async def generate_roadmap(request: GenerateRoadmapRequest):
    """
    Synthesize a full prerequisite learning dependency graph for any topic.
    """
    try:
        return RoadmapService.generate_roadmap(goal=request.goal, depth=request.depth)
    except Exception as e:
        logger.error(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/path", response_model=PrerequisitePathResult)
async def get_prerequisite_path(
    request: PathAnalysisRequest,
    session: AsyncSession = Depends(get_session),
):
    """
    Calculates the exact prerequisite ancestor tree and downstream unlocks for a node.
    """
    nodes = request.nodes
    edges = request.edges

    if nodes is None or edges is None:
        # Load from database
        notes_res = await session.execute(select(Note))
        all_notes = notes_res.scalars().all()
        nodes = [{"id": str(n.id), "title": n.title, "name": n.title, "status": "in_progress"} for n in all_notes]

        links_res = await session.execute(select(NoteLink))
        edges = [{"source": str(l.source_id), "target": str(l.target_id), "type": "requires"} for l in links_res.scalars().all()]

    return RoadmapService.get_prerequisite_path(request.target_id, nodes, edges)


@router.post("/quiz", response_model=TopicQuiz)
async def generate_quiz(request: QuizRequest):
    """
    Generates an interactive verification quiz for a topic.
    """
    return RoadmapService.generate_topic_quiz(request.topic_id, request.topic_title)


@router.post("/materialize")
async def materialize_roadmap(
    request: MaterializeRoadmapRequest,
    session: AsyncSession = Depends(get_session),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Converts a generated roadmap into persistent notes, wikilinks, and tags in the Second Brain.
    """
    created_notes_map = {}  # node_id -> Note instance
    user_id = current_user.id if current_user else None

    # 1. Create or fetch Roadmap Tag
    tag_clean = "roadmap"
    tag_res = await session.execute(select(Tag).where(Tag.name == tag_clean))
    roadmap_tag = tag_res.scalars().first()
    if not roadmap_tag:
        roadmap_tag = Tag(name=tag_clean)
        session.add(roadmap_tag)
        await session.commit()
        await session.refresh(roadmap_tag)

    # 2. Create Notes for each node
    for node in request.nodes:
        n_id = node.get("id")
        title = node.get("title") or "Untitled Topic"
        desc = node.get("description", "")
        zone = node.get("zone", "Core")
        difficulty = node.get("difficulty", "intermediate")
        hours = node.get("estimated_hours", 4)
        resources = node.get("resources", [])
        takeaways = node.get("key_takeaways", [])

        # Format rich markdown note body
        markdown_lines = [
            f"# {title}",
            "",
            f"> **Zone**: `{zone}` | **Difficulty**: `{difficulty.capitalize()}` | **Estimated Time**: `{hours} hours`",
            "",
            "## Description",
            desc,
            "",
        ]

        if takeaways:
            markdown_lines.extend(["## Key Takeaways", ""])
            for t in takeaways:
                markdown_lines.append(f"- {t}")
            markdown_lines.append("")

        if resources:
            markdown_lines.extend(["## Recommended Resources", ""])
            for r in resources:
                markdown_lines.append(f"- {r}")
            markdown_lines.append("")

        new_note = Note(
            title=title,
            content="\n".join(markdown_lines),
            user_id=user_id,
        )
        session.add(new_note)
        await session.commit()
        await session.refresh(new_note)

        created_notes_map[n_id] = new_note
        session.add(NoteTag(note_id=new_note.id, tag_id=roadmap_tag.id))

    # 3. Create NoteLinks for edges
    for edge in request.edges:
        src_id = edge.get("source")
        tgt_id = edge.get("target")

        src_note = created_notes_map.get(src_id)
        tgt_note = created_notes_map.get(tgt_id)

        if src_note and tgt_note:
            session.add(NoteLink(source_id=src_note.id, target_id=tgt_note.id))

    await session.commit()

    return {
        "status": "success",
        "message": f"Successfully materialized roadmap '{request.subject}' with {len(created_notes_map)} notes and {len(request.edges)} dependency links.",
        "created_count": len(created_notes_map),
    }
