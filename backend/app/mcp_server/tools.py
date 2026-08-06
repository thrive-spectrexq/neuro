from __future__ import annotations

import json
import logging
from typing import Any

from sqlmodel import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.core.config import settings
from app.models.note import Note, NoteLink
from app.models.tag import Tag, NoteTag
from app.services.roadmap_service import RoadmapService
from app.services.agent.tools import ToolRegistry

logger = logging.getLogger(__name__)

# Dedicated engine for MCP queries
engine = create_async_engine(settings.SQLALCHEMY_DATABASE_URI, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


MCP_TOOLS_DEFINITIONS = [
    {
        "name": "neuro_search_notes",
        "description": "Search the Neuro second-brain for notes, concepts, and markdown documentation using full-text and semantic matching.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query or concept name to look up in the second brain"},
                "limit": {"type": "integer", "description": "Maximum number of notes to return (default: 5)", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "neuro_get_graph",
        "description": "Fetch the entire interactive knowledge graph topology with nodes, tags, and bi-directional links.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "type_filter": {
                    "type": "string",
                    "description": "Filter by node type: 'all', 'note', or 'tag'",
                    "enum": ["all", "note", "tag"],
                    "default": "all",
                }
            },
        },
    },
    {
        "name": "neuro_get_prerequisite_path",
        "description": "Calculates the prerequisite dependency chain (what must be learned first) and unlocked concepts for any study topic or note.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "topic_id": {"type": "string", "description": "ID or title of the topic/note to analyze for prerequisites"}
            },
            "required": ["topic_id"],
        },
    },
    {
        "name": "neuro_generate_roadmap",
        "description": "Generates a structured learning dependency graph with difficulty levels, estimated hours, and prerequisite ordering for any subject or goal.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "goal": {"type": "string", "description": "Learning goal or subject (e.g., 'Rust Async', 'Machine Learning Math', 'Distributed Systems')"},
                "depth": {"type": "string", "description": "Depth level: 'beginner', 'intermediate', or 'advanced'", "default": "intermediate"},
            },
            "required": ["goal"],
        },
    },
    {
        "name": "neuro_create_note",
        "description": "Creates a new note in the Neuro second-brain with automatic tagging and markdown support.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the note"},
                "content": {"type": "string", "description": "Markdown body of the note"},
                "tags": {"type": "array", "items": {"type": "string"}, "description": "List of tags (without # prefix)", "default": []},
            },
            "required": ["title", "content"],
        },
    },
    {
        "name": "neuro_execute_system_command",
        "description": "Executes an OS native desktop command via Neuro's local deterministic agent (e.g., lock screen, take screenshot, mute audio, launch app).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "command": {"type": "string", "description": "Natural language command or OS action to execute"}
            },
            "required": ["command"],
        },
    },
    {
        "name": "neuro_get_system_status",
        "description": "Inspects the status of the Neuro desktop instance, database metrics, and agent capabilities.",
        "inputSchema": {
            "type": "object",
            "properties": {},
        },
    },
]


async def handle_search_notes(arguments: dict[str, Any]) -> str:
    query = arguments.get("query", "").strip().lower()
    limit = int(arguments.get("limit", 5))

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Note))
        all_notes = result.scalars().all()

        matching = []
        for note in all_notes:
            score = 0
            if query in (note.title or "").lower():
                score += 10
            if query in (note.content or "").lower():
                score += 5
            if score > 0:
                matching.append((score, note))

        matching.sort(key=lambda x: x[0], reverse=True)
        top_notes = [x[1] for x in matching[:limit]]

        if not top_notes:
            return json.dumps({"status": "empty", "message": f"No notes found matching '{query}'", "results": []})

        output = []
        for n in top_notes:
            output.append({
                "id": str(n.id),
                "title": n.title,
                "content_preview": (n.content[:300] + "...") if n.content and len(n.content) > 300 else n.content,
                "created_at": n.created_at.isoformat() if hasattr(n, "created_at") and n.created_at else None,
            })

        return json.dumps({"status": "success", "query": query, "count": len(output), "results": output}, indent=2)


async def handle_get_graph(arguments: dict[str, Any]) -> str:
    type_filter = arguments.get("type_filter", "all")
    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()

        nodes = []
        links = []
        seen_ids = set()

        for n in notes:
            if type_filter in ("all", "note"):
                nodes.append({"id": str(n.id), "name": n.title or "Untitled Note", "type": "note"})
                seen_ids.add(str(n.id))

        if notes:
            note_ids = [n.id for n in notes]
            links_res = await session.execute(
                select(NoteLink).where(NoteLink.source_id.in_(note_ids), NoteLink.target_id.in_(note_ids))
            )
            for link in links_res.scalars().all():
                links.append({"source": str(link.source_id), "target": str(link.target_id), "type": "link"})

            if type_filter in ("all", "tag"):
                tags_res = await session.execute(select(NoteTag).where(NoteTag.note_id.in_(note_ids)))
                note_tags = tags_res.scalars().all()
                tag_ids = list({nt.tag_id for nt in note_tags})
                if tag_ids:
                    tags_list = await session.execute(select(Tag).where(Tag.id.in_(tag_ids)))
                    for t in tags_list.scalars().all():
                        t_id = str(t.id)
                        if t_id not in seen_ids:
                            nodes.append({"id": t_id, "name": f"#{t.name}", "type": "tag"})
                            seen_ids.add(t_id)

                    for nt in note_tags:
                        s_id, t_id = str(nt.note_id), str(nt.tag_id)
                        if s_id in seen_ids and t_id in seen_ids:
                            links.append({"source": s_id, "target": t_id, "type": "tag"})

        return json.dumps({"nodes": nodes, "links": links, "total_nodes": len(nodes), "total_links": len(links)}, indent=2)


async def handle_get_prerequisite_path(arguments: dict[str, Any]) -> str:
    topic_id = arguments.get("topic_id", "")
    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()

        nodes = [{"id": str(n.id), "title": n.title, "name": n.title, "status": "in_progress"} for n in notes]
        links_res = await session.execute(select(NoteLink))
        edges = [{"source": str(l.source_id), "target": str(l.target_id), "type": "requires"} for l in links_res.scalars().all()]

        result = RoadmapService.get_prerequisite_path(topic_id, nodes, edges)
        return json.dumps(result.model_dump(), indent=2)


async def handle_generate_roadmap(arguments: dict[str, Any]) -> str:
    goal = arguments.get("goal", "")
    depth = arguments.get("depth", "intermediate")
    roadmap = RoadmapService.generate_roadmap(goal=goal, depth=depth)
    return json.dumps(roadmap.model_dump(), indent=2)


async def handle_create_note(arguments: dict[str, Any]) -> str:
    title = arguments.get("title", "Untitled Note")
    content = arguments.get("content", "")
    tags = arguments.get("tags", [])

    async with AsyncSessionLocal() as session:
        new_note = Note(title=title, content=content)
        session.add(new_note)
        await session.commit()
        await session.refresh(new_note)

        for tag_name in tags:
            tag_clean = tag_name.replace("#", "").strip()
            if not tag_clean:
                continue
            tag_res = await session.execute(select(Tag).where(Tag.name == tag_clean))
            tag_obj = tag_res.scalars().first()
            if not tag_obj:
                tag_obj = Tag(name=tag_clean)
                session.add(tag_obj)
                await session.commit()
                await session.refresh(tag_obj)

            session.add(NoteTag(note_id=new_note.id, tag_id=tag_obj.id))
        await session.commit()

        return json.dumps({
            "status": "success",
            "message": f"Note '{title}' created successfully",
            "note_id": str(new_note.id),
        }, indent=2)


async def handle_execute_system_command(arguments: dict[str, Any]) -> str:
    command = arguments.get("command", "")
    from app.services.agent.intent_parser import IntentParser

    intent = IntentParser.parse(command)
    result = await ToolRegistry.execute_intent(intent)
    return json.dumps(result, indent=2)


async def handle_get_system_status(_arguments: dict[str, Any]) -> str:
    async with AsyncSessionLocal() as session:
        notes_count = len((await session.execute(select(Note))).scalars().all())
        tags_count = len((await session.execute(select(Tag))).scalars().all())

    return json.dumps({
        "status": "online",
        "agent": "Neuro Autonomous Voice & Second-Brain Agent",
        "version": "0.1.1",
        "database": {
            "type": "SQLite / SQLModel",
            "notes_count": notes_count,
            "tags_count": tags_count,
        },
        "capabilities": [
            "Generative Roadmaps & Prerequisite Dependency Graphs",
            "Model Context Protocol (MCP) Bridge",
            "High-Fidelity Obsidian Vault Two-Way Sync",
            "Deterministic OS-Level Tool Execution",
            "Interactive Topic Knowledge Quizzes",
        ],
    }, indent=2)
