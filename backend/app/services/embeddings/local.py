"""
Local SentenceTransformer embedding provider.

Uses HuggingFace sentence-transformers for fully offline,
privacy-preserving text embeddings.
"""

import logging
from functools import lru_cache

from sentence_transformers import SentenceTransformer

from app.core.config import get_settings
from app.services.embeddings.base import EmbeddingProvider, EmbeddingResult

logger = logging.getLogger("neuro.embeddings.local")
settings = get_settings()


class LocalEmbeddingProvider(EmbeddingProvider):
    """
    Local embedding provider using SentenceTransformers.

    Runs entirely on the local machine without external API calls.
    Supports any HuggingFace sentence-transformer model.
    """

    def __init__(self, model_name: str | None = None):
        self._model_name = model_name or settings.EMBEDDING_MODEL
        self._model: SentenceTransformer | None = None
        self._dimension: int | None = None

    def _get_model(self) -> SentenceTransformer:
        """Lazy-load the model on first use."""
        if self._model is None:
            logger.info(f"Loading embedding model: {self._model_name}")
            self._model = SentenceTransformer(self._model_name)
            self._dimension = self._model.get_sentence_embedding_dimension()
            logger.info(f"Loaded {self._model_name} (dimension={self._dimension})")
        return self._model

    async def embed(self, texts: list[str]) -> EmbeddingResult:
        model = self._get_model()
        embeddings = model.encode(
            texts,
            show_progress_bar=False,
            normalize_embeddings=True,
        )
        return EmbeddingResult(
            embeddings=[e.tolist() for e in embeddings],
            model=self._model_name,
            token_count=None,
        )

    @property
    def dimension(self) -> int:
        if self._dimension is None:
            self._get_model()
        assert self._dimension is not None
        return self._dimension

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def max_batch_size(self) -> int:
        return 128


@lru_cache(maxsize=4)
def get_local_embedding_provider(model_name: str | None = None) -> LocalEmbeddingProvider:
    """Get a cached instance of the local embedding provider."""
    return LocalEmbeddingProvider(model_name=model_name)
