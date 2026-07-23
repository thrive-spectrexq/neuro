import logging
import uuid
from functools import lru_cache

import chromadb
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import get_settings
from app.models.note import Note

settings = get_settings()
logger = logging.getLogger(__name__)


class SearchEngine:
    def __init__(self):
        try:
            self.chroma_client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
            self.collection = self.chroma_client.get_or_create_collection(name="notes")
        except Exception as e:
            logger.warning(f"Failed to connect to ChromaDB host, falling back to in-memory client: {e}")
            self.chroma_client = chromadb.Client()
            self.collection = self.chroma_client.get_or_create_collection(name="notes")

        self.encoder = SentenceTransformer(settings.EMBEDDING_MODEL)

    @lru_cache(maxsize=2048)
    def _encode_text_cached(self, text_content: str) -> tuple[float, ...]:
        return tuple(self.encoder.encode(text_content).tolist())

    def _get_embedding(self, text_content: str) -> list[float]:
        return list(self._encode_text_cached(text_content))

    async def index_note(self, session: AsyncSession, note: Note):
        # 1. Update SQLite FTS5 table
        await session.execute(text("DELETE FROM note_fts WHERE id = :id"), {"id": str(note.id)})
        await session.execute(
            text("INSERT INTO note_fts (id, title, content) VALUES (:id, :title, :content)"),
            {"id": str(note.id), "title": note.title, "content": note.content},
        )

        # 2. Update ChromaDB
        try:
            text_content = f"{note.title}\n\n{note.content}"
            embedding = self._get_embedding(text_content)

            self.collection.upsert(
                documents=[text_content],
                embeddings=[embedding],
                metadatas=[
                    {
                        "title": note.title,
                        "user_id": str(note.user_id),
                        "project_id": str(note.project_id) if note.project_id else "",
                    }
                ],
                ids=[str(note.id)],
            )
        except Exception as e:
            logger.error(f"Failed to index note {note.id} in ChromaDB: {e}", exc_info=True)

    async def remove_note(self, session: AsyncSession, note_id: uuid.UUID):
        await session.execute(text("DELETE FROM note_fts WHERE id = :id"), {"id": str(note_id)})
        try:
            self.collection.delete(ids=[str(note_id)])
        except Exception as e:
            logger.error(f"Failed to delete note {note_id} from ChromaDB: {e}", exc_info=True)

    async def hybrid_search(
        self,
        session: AsyncSession,
        query: str,
        user_id: uuid.UUID,
        project_id: uuid.UUID | None = None,
        limit: int = 10,
    ) -> list[dict]:
        # Semantic Search
        embedding = self._get_embedding(query)
        if project_id:
            where_clause = {"$and": [{"user_id": str(user_id)}, {"project_id": str(project_id)}]}
        else:
            where_clause = {"user_id": str(user_id)}

        vector_results = {}
        try:
            vector_results = self.collection.query(query_embeddings=[embedding], n_results=limit, where=where_clause)
        except Exception as e:
            logger.error(f"ChromaDB vector query failed: {e}", exc_info=True)

        # FTS Search
        fts_query = text("""
            SELECT id, title, content, rank 
            FROM note_fts 
            WHERE note_fts MATCH :query 
            ORDER BY rank 
            LIMIT :limit
        """)
        clean_query = " OR ".join([word for word in query.replace('"', "").split() if word.isalnum()])
        if not clean_query:
            clean_query = '""'

        try:
            fts_res = await session.execute(fts_query, {"query": clean_query, "limit": limit})
            fts_rows = fts_res.fetchall()
        except Exception as e:
            logger.warning(f"FTS search query failed: {e}")
            fts_rows = []

        # Reciprocal Rank Fusion (RRF) standard score combination (k=60)
        rrf_k = 60
        rrf_scores: dict[str, float] = {}

        if vector_results.get("ids") and vector_results["ids"][0]:
            for rank, doc_id in enumerate(vector_results["ids"][0]):
                rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

        for rank, row in enumerate(fts_rows):
            doc_id = str(row.id)
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + (1.0 / (rrf_k + rank + 1))

        sorted_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:limit]

        if not sorted_ids:
            return []

        uuid_ids = []
        for i in sorted_ids:
            try:
                uuid_ids.append(uuid.UUID(i))
            except ValueError:
                pass

        stmt = select(Note).where(
            Note.id.in_(uuid_ids),
            Note.user_id == user_id,
            Note.is_archived == False,  # noqa: E712
        )
        if project_id:
            stmt = stmt.where(Note.project_id == project_id)

        notes_res = await session.execute(stmt)
        found_notes = notes_res.scalars().all()

        notes_map = {
            str(note.id): {"id": str(note.id), "title": note.title, "content": note.content} for note in found_notes
        }

        results = []
        for doc_id in sorted_ids:
            if doc_id in notes_map:
                results.append(notes_map[doc_id])

        return results


search_engine = SearchEngine()
