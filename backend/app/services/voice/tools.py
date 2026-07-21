from typing import Dict, Any, List
import json
from sqlmodel import Session, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.note import Note
from app.core.database import engine
from app.services.search.engine import search_engine

async def create_note(args: Dict[str, Any]) -> str:
    """Create a new note in Neuro."""
    title = args.get("title", "Untitled Note")
    content = args.get("content", "")
    project_id = args.get("project_id", None)
    
    async with AsyncSession(engine) as session:
        # For simplicity, assign to a default user or context user if we pass it
        # Realistically, this would take the authenticated user's ID.
        # We will assume a default test user or fetch from context.
        # Here we just create the note.
        import uuid
        note = Note(
            id=uuid.uuid4(),
            title=title,
            content=content,
            project_id=project_id,
            user_id=uuid.UUID("00000000-0000-0000-0000-000000000000") # placeholder
        )
        session.add(note)
        await session.commit()
        return f"Successfully created note '{title}'."

async def search_knowledge_base(args: Dict[str, Any]) -> str:
    """Search the Neuro knowledge base."""
    query = args.get("query", "")
    project_id = args.get("project_id", None)
    
    results = await search_engine.hybrid_search(
        query=query,
        project_id=str(project_id) if project_id else None,
        limit=3
    )
    
    if not results:
        return "No results found for that query."
        
    formatted = []
    for r in results:
        formatted.append(f"Title: {r['title']}\nSnippet: {r['content'][:200]}...")
        
    return "\n\n".join(formatted)

VOICE_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_note",
            "description": "Create a new note in the user's workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the note"},
                    "content": {"type": "string", "description": "Markdown content of the note"},
                    "project_id": {"type": "string", "description": "Optional project UUID"}
                },
                "required": ["title", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_knowledge_base",
            "description": "Search the user's notes and documents.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"},
                    "project_id": {"type": "string", "description": "Optional project UUID to restrict search"}
                },
                "required": ["query"]
            }
        }
    }
]

VOICE_FUNCTIONS = {
    "create_note": create_note,
    "search_knowledge_base": search_knowledge_base
}
