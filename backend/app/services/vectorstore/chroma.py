"""
ChromaDB implementation of the VectorStore abstraction.

Wraps chromadb.HttpClient with the vendor-agnostic VectorStore interface,
providing seamless migration capabilities to other backends.
"""

import logging
from typing import Any

import chromadb

from app.core.config import get_settings
from app.services.vectorstore.base import (
    CollectionInfo,
    DistanceMetric,
    VectorSearchResult,
    VectorStore,
)

logger = logging.getLogger("neuro.vectorstore.chroma")
settings = get_settings()

# Map our distance metric enum to ChromaDB's naming
_CHROMA_DISTANCE_MAP: dict[DistanceMetric, str] = {
    DistanceMetric.COSINE: "cosine",
    DistanceMetric.EUCLIDEAN: "l2",
    DistanceMetric.DOT_PRODUCT: "ip",
}


class ChromaVectorStore(VectorStore):
    """
    ChromaDB-backed vector store implementation.

    Connects to a ChromaDB server via HTTP or falls back to an
    ephemeral in-memory client if the server is unreachable.
    """

    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        in_memory_fallback: bool = True,
    ):
        host = host or settings.CHROMA_HOST
        port = port or settings.CHROMA_PORT

        try:
            self._client = chromadb.HttpClient(host=host, port=port)
            self._client.heartbeat()
            logger.info(f"Connected to ChromaDB at {host}:{port}")
        except Exception as e:
            if in_memory_fallback:
                logger.warning(f"Failed to connect to ChromaDB at {host}:{port}, falling back to in-memory client: {e}")
                self._client = chromadb.Client()
            else:
                raise ConnectionError(f"Cannot connect to ChromaDB at {host}:{port}") from e

    async def create_collection(
        self,
        name: str,
        dimension: int,
        distance_metric: DistanceMetric = DistanceMetric.COSINE,
    ) -> None:
        chroma_metric = _CHROMA_DISTANCE_MAP.get(distance_metric, "cosine")
        self._client.get_or_create_collection(
            name=name,
            metadata={"hnsw:space": chroma_metric},
        )
        logger.info(f"Created/verified collection '{name}' with metric={chroma_metric}")

    async def delete_collection(self, name: str) -> None:
        try:
            self._client.delete_collection(name=name)
            logger.info(f"Deleted collection '{name}'")
        except Exception as e:
            logger.warning(f"Failed to delete collection '{name}': {e}")

    async def collection_info(self, name: str) -> CollectionInfo:
        collection = self._client.get_collection(name=name)
        count = collection.count()
        return CollectionInfo(
            name=name,
            count=count,
            dimension=None,  # ChromaDB doesn't expose this directly
            distance_metric=DistanceMetric.COSINE,
        )

    async def upsert(
        self,
        collection: str,
        ids: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]] | None = None,
        documents: list[str] | None = None,
    ) -> None:
        col = self._client.get_or_create_collection(name=collection)

        kwargs: dict[str, Any] = {
            "ids": ids,
            "embeddings": embeddings,
        }
        if metadatas is not None:
            # ChromaDB requires metadata values to be str, int, float, or bool
            sanitized = [_sanitize_metadata(m) for m in metadatas]
            kwargs["metadatas"] = sanitized
        if documents is not None:
            kwargs["documents"] = documents

        col.upsert(**kwargs)
        logger.debug(f"Upserted {len(ids)} vectors into '{collection}'")

    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorSearchResult]:
        col = self._client.get_or_create_collection(name=collection)

        kwargs: dict[str, Any] = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, col.count() or top_k),
            "include": ["metadatas", "documents", "distances"],
        }
        if filter:
            kwargs["where"] = _build_chroma_filter(filter)

        results = col.query(**kwargs)

        search_results: list[VectorSearchResult] = []
        if results and results["ids"] and results["ids"][0]:
            ids = results["ids"][0]
            distances = results["distances"][0] if results.get("distances") else [0.0] * len(ids)
            metadatas = results["metadatas"][0] if results.get("metadatas") else [{}] * len(ids)
            documents = results["documents"][0] if results.get("documents") else [None] * len(ids)

            for i, doc_id in enumerate(ids):
                # Convert distance to similarity score (higher = better)
                score = 1.0 / (1.0 + distances[i])
                search_results.append(
                    VectorSearchResult(
                        id=doc_id,
                        score=score,
                        metadata=metadatas[i] or {},
                        document=documents[i],
                    )
                )

        return search_results

    async def get(
        self,
        collection: str,
        ids: list[str],
    ) -> list[VectorSearchResult]:
        col = self._client.get_or_create_collection(name=collection)
        results = col.get(ids=ids, include=["metadatas", "documents"])

        return [
            VectorSearchResult(
                id=results["ids"][i],
                score=1.0,
                metadata=results["metadatas"][i] if results.get("metadatas") else {},
                document=results["documents"][i] if results.get("documents") else None,
            )
            for i in range(len(results["ids"]))
        ]

    async def delete(
        self,
        collection: str,
        ids: list[str],
    ) -> None:
        col = self._client.get_or_create_collection(name=collection)
        col.delete(ids=ids)
        logger.debug(f"Deleted {len(ids)} vectors from '{collection}'")

    async def count(self, collection: str) -> int:
        try:
            col = self._client.get_collection(name=collection)
            return col.count()
        except Exception:
            return 0

    async def health_check(self) -> bool:
        try:
            self._client.heartbeat()
            return True
        except Exception:
            return False


def _sanitize_metadata(metadata: dict[str, Any]) -> dict[str, str | int | float | bool]:
    """Sanitize metadata values to types supported by ChromaDB."""
    sanitized: dict[str, str | int | float | bool] = {}
    for key, value in metadata.items():
        if isinstance(value, (str, int, float, bool)):
            sanitized[key] = value
        elif value is None:
            continue
        else:
            sanitized[key] = str(value)
    return sanitized


def _build_chroma_filter(filter_dict: dict[str, Any]) -> dict[str, Any]:
    """Convert a flat filter dict to ChromaDB's where clause format."""
    if len(filter_dict) == 1:
        key, value = next(iter(filter_dict.items()))
        return {key: {"$eq": value}}

    conditions = [{k: {"$eq": v}} for k, v in filter_dict.items()]
    return {"$and": conditions}
