"""
Modular embedding abstraction layer.

Provides a uniform interface for generating text embeddings from
multiple backends (local SentenceTransformers, OpenAI, Cohere, etc.).
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum


class EmbeddingModelType(str, Enum):
    LOCAL_SENTENCE_TRANSFORMER = "local_sentence_transformer"
    OPENAI = "openai"
    COHERE = "cohere"
    OLLAMA = "ollama"


@dataclass
class EmbeddingResult:
    """Result of an embedding operation."""

    embeddings: list[list[float]]
    model: str
    token_count: int | None = None


class EmbeddingProvider(ABC):
    """
    Abstract base class for embedding model providers.

    Implementations must provide methods for embedding text and
    reporting the model's vector dimension.
    """

    @abstractmethod
    async def embed(self, texts: list[str]) -> EmbeddingResult:
        """
        Generate embeddings for a list of text strings.

        Args:
            texts: List of text strings to embed.

        Returns:
            EmbeddingResult containing the embeddings and metadata.
        """
        ...

    async def embed_single(self, text: str) -> list[float]:
        """Convenience method to embed a single text string."""
        result = await self.embed([text])
        return result.embeddings[0]

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Return the dimensionality of the embedding vectors."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the name/identifier of the embedding model."""
        ...

    @property
    def max_batch_size(self) -> int:
        """Maximum number of texts that can be embedded in a single call."""
        return 64

    async def embed_batched(self, texts: list[str]) -> EmbeddingResult:
        """
        Embed texts in batches respecting max_batch_size.

        Automatically splits large lists into batches to avoid
        memory issues or API limits.
        """
        all_embeddings: list[list[float]] = []
        total_tokens = 0

        for i in range(0, len(texts), self.max_batch_size):
            batch = texts[i : i + self.max_batch_size]
            result = await self.embed(batch)
            all_embeddings.extend(result.embeddings)
            if result.token_count:
                total_tokens += result.token_count

        return EmbeddingResult(
            embeddings=all_embeddings,
            model=self.model_name,
            token_count=total_tokens if total_tokens > 0 else None,
        )
