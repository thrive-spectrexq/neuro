import uuid

import chromadb
from sentence_transformers import SentenceTransformer
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.note import Note

settings = get_settings()


class SearchEngine:
    def __init__(self):
        try:
            self.chroma_client = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
            self.collection = self.chroma_client.get_or_create_collection(name="notes")
        except Exception:
            # Fallback for testing/local without chroma host
            self.chroma_client = chromadb.Client()
            self.collection = self.chroma_client.get_or_create_collection(name="notes")

        self.encoder = SentenceTransformer(settings.EMBEDDING_MODEL)

    def _get_embedding(self, text: str) -> list[float]:
        return self.encoder.encode(text).tolist()

    async def index_note(self, session: AsyncSession, note: Note):
        # 1. Update SQLite FTS5 table

        # Remove old entry if exists, then insert
        await session.execute(text("DELETE FROM note_fts WHERE id = :id"), {"id": str(note.id)})
        await session.execute(
            text("INSERT INTO note_fts (id, title, content) VALUES (:id, :title, :content)"),
            {"id": str(note.id), "title": note.title, "content": note.content},
        )

        # 2. Update ChromaDB
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

    async def remove_note(self, session: AsyncSession, note_id: uuid.UUID):
        await session.execute(text("DELETE FROM note_fts WHERE id = :id"), {"id": str(note_id)})
        try:
            self.collection.delete(ids=[str(note_id)])
        except Exception:
            pass

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

        vector_results = self.collection.query(query_embeddings=[embedding], n_results=limit, where=where_clause)

        vector_scores = {}
        if vector_results["ids"] and vector_results["ids"][0]:
            for doc_id, dist in zip(vector_results["ids"][0], vector_results["distances"][0]):
                # Convert distance to a similarity score (lower distance = higher score)
                vector_scores[doc_id] = 1.0 / (1.0 + dist)

        # FTS Search
        fts_query = text("""
            SELECT id, title, content, rank 
            FROM note_fts 
            WHERE note_fts MATCH :query 
            ORDER BY rank 
            LIMIT :limit
        """)
        # Basic query normalization for FTS
        clean_query = " OR ".join([word for word in query.replace('"', "").split() if word.isalnum()])
        if not clean_query:
            clean_query = '""'

        try:
            fts_res = await session.execute(fts_query, {"query": clean_query, "limit": limit})
            fts_rows = fts_res.fetchall()
        except Exception:
            fts_rows = []

        fts_scores = {}
        for row in fts_rows:
            fts_scores[row.id] = abs(row.rank) if row.rank != 0 else 1.0

        # Combine scores
        combined_scores = {}
        all_ids = set(vector_scores.keys()).union(set(fts_scores.keys()))

        for doc_id in all_ids:
            v_score = vector_scores.get(doc_id, 0.0)
            f_score = fts_scores.get(doc_id, 0.0)
            combined_scores[doc_id] = v_score + (1.0 / (1.0 + f_score))

        sorted_ids = sorted(combined_scores.keys(), key=lambda x: combined_scores[x], reverse=True)[:limit]

        if not sorted_ids:
            return []

        placeholders = ",".join([f"'{i}'" for i in sorted_ids])

        project_param = str(project_id) if project_id else ""

        notes_query = text(
            f"SELECT id, title, content FROM note WHERE id IN ({placeholders}) AND user_id = :user_id AND is_archived = 0 AND (project_id = :project_id OR (:project_id = '' AND project_id IS NULL))"
        )
        notes_res = await session.execute(notes_query, {"user_id": str(user_id), "project_id": project_param})

        notes_map = {
            str(row.id): {"id": str(row.id), "title": row.title, "content": row.content} for row in notes_res.fetchall()
        }

        results = []
        for doc_id in sorted_ids:
            if doc_id in notes_map:
                results.append(notes_map[doc_id])

        return results


search_engine = SearchEngine()
