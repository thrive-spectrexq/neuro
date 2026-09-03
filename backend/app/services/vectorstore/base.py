"""
Vendor-agnostic vector store abstraction layer.

Provides a uniform interface for storing and retrieving vector embeddings
across multiple backends (ChromaDB, FAISS, Milvus, Pinecone, Weaviate).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class DistanceMetric(str, Enum):
    COSINE = "cosine"
    EUCLIDEAN = "euclidean"
    DOT_PRODUCT = "dot_product"


@dataclass
class VectorSearchResult:
    """A single result from a vector similarity search."""

    id: str
    score: float
    metadata: dict[str, Any] = field(default_factory=dict)
    document: str | None = None

    def __repr__(self) -> str:
        return f"VectorSearchResult(id={self.id!r}, score={self.score:.4f})"


@dataclass
class CollectionInfo:
    """Metadata about a vector collection."""

    name: str
    count: int
    dimension: int | None = None
    distance_metric: DistanceMetric = DistanceMetric.COSINE


class VectorStore(ABC):
    """
    Abstract base class for vector store backends.

    All implementations must provide async methods for CRUD operations
    and similarity search over vector embeddings.
    """

    @abstractmethod
    async def create_collection(
        self,
        name: str,
        dimension: int,
        distance_metric: DistanceMetric = DistanceMetric.COSINE,
    ) -> None:
        """Create a new collection/index for storing vectors."""
        ...

    @abstractmethod
    async def delete_collection(self, name: str) -> None:
        """Delete an entire collection and its data."""
        ...

    @abstractmethod
    async def collection_info(self, name: str) -> CollectionInfo:
        """Get metadata about a collection."""
        ...

    @abstractmethod
    async def upsert(
        self,
        collection: str,
        ids: list[str],
        embeddings: list[list[float]],
        metadatas: list[dict[str, Any]] | None = None,
        documents: list[str] | None = None,
    ) -> None:
        """
        Insert or update vectors in a collection.

        Args:
            collection: Target collection name.
            ids: Unique identifiers for each vector.
            embeddings: Dense vector representations.
            metadatas: Optional metadata dictionaries per vector.
            documents: Optional raw document text per vector.
        """
        ...

    @abstractmethod
    async def search(
        self,
        collection: str,
        query_embedding: list[float],
        top_k: int = 10,
        filter: dict[str, Any] | None = None,
    ) -> list[VectorSearchResult]:
        """
        Perform similarity search against stored vectors.

        Args:
            collection: Collection to search.
            query_embedding: Query vector.
            top_k: Number of results to return.
            filter: Optional metadata filter criteria.

        Returns:
            List of VectorSearchResult ordered by descending similarity.
        """
        ...

    @abstractmethod
    async def get(
        self,
        collection: str,
        ids: list[str],
    ) -> list[VectorSearchResult]:
        """Retrieve specific vectors by their IDs."""
        ...

    @abstractmethod
    async def delete(
        self,
        collection: str,
        ids: list[str],
    ) -> None:
        """Delete specific vectors by their IDs."""
        ...

    @abstractmethod
    async def count(self, collection: str) -> int:
        """Return the number of vectors in a collection."""
        ...

    async def health_check(self) -> bool:
        """Check if the vector store backend is reachable."""
        try:
            await self.count("__health_check__")
            return True
        except Exception:
            return False
