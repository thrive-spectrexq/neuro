from __future__ import annotations

import json
import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models.note import Note, NoteLink
from app.models.tag import NoteTag, Tag
from app.services.agent.tools import ToolRegistry
from app.services.roadmap_service import RoadmapService

logger = logging.getLogger(__name__)

from app.core.config import get_settings

settings = get_settings()

from sqlmodel import select

# Minimal sync/async DB setup for tools
# In a real setup, you'd likely reuse the app's db.py.
engine = create_async_engine(str(settings.DATABASE_URL), echo=False)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


MCP_TOOLS_DEFINITIONS = [
    {
        "name": "neuro_search_notes",
        "description": "Search the Neuro second-brain for notes, concepts, and markdown documentation using full-text and semantic matching.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query or concept name to look up in the second brain",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum number of notes to return (default: 5)",
                    "default": 5,
                },
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
                "topic_id": {
                    "type": "string",
                    "description": "ID or title of the topic/note to analyze for prerequisites",
                }
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
                "goal": {
                    "type": "string",
                    "description": "Learning goal or subject (e.g., 'Rust Async', 'Machine Learning Math', 'Distributed Systems')",
                },
                "depth": {
                    "type": "string",
                    "description": "Depth level: 'beginner', 'intermediate', or 'advanced'",
                    "default": "intermediate",
                },
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
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "List of tags (without # prefix)",
                    "default": [],
                },
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
    {
        "name": "neuro_calculate_blast_radius",
        "description": "Calculates upstream callers and downstream dependencies impacted by changing a symbol, class, function, or file in a codebase.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "target": {"type": "string", "description": "Symbol name or file path to evaluate blast radius for"},
                "max_depth": {"type": "integer", "description": "Maximum BFS traversal depth", "default": 3},
            },
            "required": ["target"],
        },
    },
    {
        "name": "neuro_analyze_codebase_graph",
        "description": "Performs Louvain community clustering, God node centrality ranking, and architectural diagnostic checks on a codebase.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "root_path": {
                    "type": "string",
                    "description": "Root directory path to scan (defaults to current project root)",
                },
            },
        },
    },
    {
        "name": "neuro_generate_graph_wiki",
        "description": "Generates Wikipedia-style Markdown documentation with cross-links from the codebase knowledge graph.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "out_dir": {"type": "string", "description": "Output directory for markdown files"},
            },
        },
    },
    {
        "name": "neuro_lint_vault",
        "description": "Runs deterministic health diagnostics across the Obsidian vault (detects dead links, orphans, metadata gaps, empty sections, and calculates health score).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "vault_path": {
                    "type": "string",
                    "description": "Optional path to local Obsidian vault directory on disk. If omitted, lints current database notes.",
                }
            },
        },
    },
    {
        "name": "neuro_create_canvas",
        "description": "Generates a native Obsidian .canvas (JSON Canvas 1.0) spatial map from notes or target learning roadmaps.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Canvas title", "default": "Knowledge Canvas"},
                "note_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Optional list of note IDs to include in the visual canvas",
                },
            },
        },
    },
    {
        "name": "neuro_retrieve_vault_bm25",
        "description": "Executes Okapi BM25 contextual keyword retrieval across notes with snippet extraction and relevance scoring.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query terms"},
                "top_k": {"type": "integer", "description": "Max results to return", "default": 5},
            },
            "required": ["query"],
        },
    },
    {
        "name": "neuro_route_note",
        "description": "Calculates optimal note destination folder, filename, and tags according to PARA, LYT, Zettelkasten, or Generic methodology.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "Title of the note to file"},
                "content": {"type": "string", "description": "Content of the note", "default": ""},
                "mode": {
                    "type": "string",
                    "description": "Methodology mode: 'generic', 'lyt', 'para', or 'zettelkasten'",
                    "enum": ["generic", "lyt", "para", "zettelkasten"],
                    "default": "generic",
                },
            },
            "required": ["title"],
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
            output.append(
                {
                    "id": str(n.id),
                    "title": n.title,
                    "content_preview": (n.content[:300] + "...") if n.content and len(n.content) > 300 else n.content,
                    "created_at": n.created_at.isoformat() if hasattr(n, "created_at") and n.created_at else None,
                }
            )

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

        return json.dumps(
            {"nodes": nodes, "links": links, "total_nodes": len(nodes), "total_links": len(links)}, indent=2
        )


async def handle_get_prerequisite_path(arguments: dict[str, Any]) -> str:
    topic_id = arguments.get("topic_id", "")
    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()

        nodes = [{"id": str(n.id), "title": n.title, "name": n.title, "status": "in_progress"} for n in notes]
        links_res = await session.execute(select(NoteLink))
        edges = [
            {"source": str(link.source_id), "target": str(link.target_id), "type": "requires"}
            for link in links_res.scalars().all()
        ]

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
        import uuid
        new_note = Note(title=title, content=content, user_id=uuid.UUID(int=0))
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

        return json.dumps(
            {
                "status": "success",
                "message": f"Note '{title}' created successfully",
                "note_id": str(new_note.id),
            },
            indent=2,
        )


async def handle_execute_system_command(arguments: dict[str, Any]) -> str:
    command = arguments.get("command", "")
    from app.services.agent.intent_parser import IntentParser

    parser = IntentParser()
    intent = parser.parse(command)
    result = await ToolRegistry.execute_intent(intent)
    return json.dumps(result, indent=2)


async def handle_get_system_status(_arguments: dict[str, Any]) -> str:
    async with AsyncSessionLocal() as session:
        notes_count = len((await session.execute(select(Note))).scalars().all())
        tags_count = len((await session.execute(select(Tag))).scalars().all())

    return json.dumps(
        {
            "status": "online",
            "agent": "Neuro Autonomous Voice & Second-Brain Agent",
            "version": "0.1.3",
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
                "AST Codebase Knowledge Graph Extraction",
                "Louvain Community Detection & God Node Centrality",
                "Blast Radius & Change Impact Analysis",
                "Wikipedia-Style Markdown Documentation Generation",
            ],
        },
        indent=2,
    )


async def handle_calculate_blast_radius(arguments: dict[str, Any]) -> str:
    import os

    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

    target = arguments.get("target", "")
    depth = int(arguments.get("max_depth", 3))
    extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=400)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    hits = graph_analytics.compute_blast_radius(G, seed_id_or_query=target, max_depth=depth)
    return json.dumps(
        {
            "target": target,
            "total_impacted": len(hits),
            "impacted": [
                {
                    "node_id": h.node_id,
                    "label": h.label,
                    "depth": h.depth,
                    "via_relation": h.via_relation,
                    "source_file": h.source_file,
                    "source_location": h.source_location,
                }
                for h in hits
            ],
        },
        indent=2,
    )


async def handle_analyze_codebase_graph(arguments: dict[str, Any]) -> str:
    import os

    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_analytics, graph_extractor

    root_path = arguments.get("root_path") or os.getcwd()
    extracted = graph_extractor.extract_from_directory(root_path, max_files=400)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    result = graph_analytics.analyze_graph(G)
    return json.dumps(
        {
            "total_nodes": result.total_nodes,
            "total_edges": result.total_edges,
            "density": result.density,
            "communities_count": result.communities_count,
            "communities": result.communities,
            "god_nodes": result.god_nodes,
            "circular_dependencies": result.circular_dependencies,
            "bridge_nodes": result.bridge_nodes,
        },
        indent=2,
    )


async def handle_generate_graph_wiki(arguments: dict[str, Any]) -> str:
    import os

    from app.services.graph_intelligence_service import GraphAnalyticsEngine, graph_extractor, graph_wiki_gen

    out_dir = arguments.get("out_dir")
    extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=400)
    G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])
    articles = graph_wiki_gen.generate_wiki(G, out_dir=out_dir)
    return json.dumps(
        {
            "article_count": len(articles),
            "articles": list(articles.keys()),
            "index_preview": articles.get("INDEX.md", "")[:500],
        },
        indent=2,
    )


async def handle_lint_vault(arguments: dict[str, Any]) -> str:
    from app.services.obsidian_lint_service import ObsidianLintService

    vault_path = arguments.get("vault_path")
    if vault_path:
        report = ObsidianLintService.lint_filesystem_vault(vault_path)
        return json.dumps(report.model_dump(), indent=2)

    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()
        notes_data = [
            {
                "id": str(n.id),
                "title": n.title,
                "content": n.content,
                "created_at": str(n.created_at) if hasattr(n, "created_at") else "now",
                "tags": [],
            }
            for n in notes
        ]
        report = ObsidianLintService.lint_notes(notes_data, vault_name="Neuro-Database-Vault")
        return json.dumps(report.model_dump(), indent=2)


async def handle_create_canvas(arguments: dict[str, Any]) -> str:
    from app.services.obsidian_canvas_service import ObsidianCanvasService

    title = arguments.get("title", "Knowledge Canvas")
    note_ids = arguments.get("note_ids")

    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()
        if note_ids:
            notes = [n for n in notes if str(n.id) in note_ids]

        n_ids = [n.id for n in notes]
        links_res = await session.execute(
            select(NoteLink).where(NoteLink.source_id.in_(n_ids), NoteLink.target_id.in_(n_ids))
        )
        links = links_res.scalars().all()

        notes_data = [{"id": str(n.id), "title": n.title, "content": n.content, "tags": []} for n in notes]
        links_data = [
            {"source": str(link_item.source_id), "target": str(link_item.target_id), "relation": "links_to"}
            for link_item in links
        ]

        canvas_doc = ObsidianCanvasService.create_canvas_from_notes(notes_data, links_data, title=title)
        return json.dumps(canvas_doc.model_dump(), indent=2)


async def handle_retrieve_vault_bm25(arguments: dict[str, Any]) -> str:
    from app.services.obsidian_retrieval_service import ObsidianRetrievalService

    query = arguments.get("query", "")
    top_k = int(arguments.get("top_k", 5))

    async with AsyncSessionLocal() as session:
        notes_res = await session.execute(select(Note))
        notes = notes_res.scalars().all()
        notes_data = [{"id": str(n.id), "title": n.title, "content": n.content, "tags": []} for n in notes]

        retrieval = ObsidianRetrievalService.search_bm25(query, notes_data, top_k=top_k)
        return json.dumps(retrieval.model_dump(), indent=2)


async def handle_route_note(arguments: dict[str, Any]) -> str:
    from app.services.obsidian_mode_service import ObsidianModeService

    title = arguments.get("title", "")
    content = arguments.get("content", "")
    mode = arguments.get("mode", "generic")

    suggestion = ObsidianModeService.route_note(title=title, content=content, mode=mode)
    return json.dumps(suggestion.model_dump(), indent=2)
