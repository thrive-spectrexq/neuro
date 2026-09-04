import logging
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import engine
from app.models.note import Note
from app.services.agent.tools import agent_tools_registry

logger = logging.getLogger(__name__)


async def create_note(args: dict[str, Any], user_id: uuid.UUID = None) -> str:
    """Create a new note in Neuro."""
    title = args.get("title", "Untitled Note")
    content = args.get("content", "")
    project_id = args.get("project_id", None)
    
    if user_id is None:
        user_id = args.get("user_id") or uuid.UUID(int=0)

    async with AsyncSession(engine) as session:
        import uuid as _uuid

        note = Note(
            id=_uuid.uuid4(),
            title=title,
            content=content or f"# {title}\n\n*Created via Voice*",
            project_id=project_id,
            user_id=user_id,
        )
        session.add(note)
        await session.commit()
        return f"Successfully created note '{title}'."


async def search_knowledge_base(args: dict[str, Any]) -> str:
    """Search the Neuro knowledge base."""
    query = args.get("query", "")
    res = await agent_tools_registry.execute("search_knowledge_base", {"query": query})
    return res.message or "Search completed."


async def open_app(args: dict[str, Any]) -> str:
    """Launch a desktop application."""
    app_name = args.get("app_name", "")
    res = await agent_tools_registry.execute("open_app", {"app_name": app_name})
    return res.voice_feedback or res.message


async def play_spotify(args: dict[str, Any]) -> str:
    """Play song or artist on Spotify."""
    query = args.get("query", "")
    res = await agent_tools_registry.execute("play_spotify", {"query": query})
    return res.voice_feedback or res.message


async def web_search(args: dict[str, Any]) -> str:
    """Search the web."""
    query = args.get("query", "")
    engine_name = args.get("engine", "google")
    res = await agent_tools_registry.execute("web_search", {"query": query, "engine": engine_name})
    return res.voice_feedback or res.message


async def set_reminder(args: dict[str, Any]) -> str:
    """Set a reminder/task."""
    title = args.get("title", "Reminder")
    minutes = int(args.get("minutes", 10))
    res = await agent_tools_registry.execute("set_reminder", {"title": title, "minutes": minutes})
    return res.voice_feedback or res.message


async def system_action(args: dict[str, Any]) -> str:
    """Execute a system action."""
    action = args.get("action", "status")
    res = await agent_tools_registry.execute("system_action", {"action": action})
    return res.voice_feedback or res.message


VOICE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "open_app",
            "description": "Launch or open a desktop app (brave, vscode, spotify, notepad, terminal, explorer, calculator, chrome, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "app_name": {"type": "string", "description": "The application name to open"},
                },
                "required": ["app_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "play_spotify",
            "description": "Play a track, artist, album, or playlist on Spotify",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Song, artist, or album to search and play"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Search the web using Google, YouTube, GitHub, or DuckDuckGo",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query keywords"},
                    "engine": {"type": "string", "description": "Search engine (google, youtube, github, duckduckgo)"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Create a new note in the user's second brain workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the note"},
                    "content": {"type": "string", "description": "Markdown content of the note"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "set_reminder",
            "description": "Set a reminder alert or task due in a specified number of minutes",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "What to remember"},
                    "minutes": {"type": "integer", "description": "Minutes from now"},
                },
                "required": ["title"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the user's notes and knowledge base.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "system_action",
            "description": "Query system status or current time",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {"type": "string", "description": "Action: time, status"},
                },
                "required": ["action"],
            },
        },
    },
]

VOICE_FUNCTIONS = {
    "open_app": open_app,
    "play_spotify": play_spotify,
    "web_search": web_search,
    "create_note": create_note,
    "set_reminder": set_reminder,
    "search_knowledge_base": search_knowledge_base,
    "system_action": system_action,
}
