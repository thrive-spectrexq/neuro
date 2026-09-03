"""
Document chunking service with multiple strategies.

Provides semantic-aware, fixed-size, and recursive chunking for
document ingestion into the vector store with full provenance tracking.
"""

import hashlib
import re
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import Enum


class ChunkingStrategy(str, Enum):
    FIXED_SIZE = "fixed_size"
    SEMANTIC = "semantic"
    RECURSIVE = "recursive"


@dataclass
class ChunkMetadata:
    """Full provenance metadata for a document chunk."""

    source_file: str | None = None
    source_url: str | None = None
    line_start: int | None = None
    line_end: int | None = None
    section_title: str | None = None
    ingestion_time: str = field(default_factory=lambda: datetime.now(UTC).isoformat())
    checksum: str = ""
    chunk_index: int = 0
    total_chunks: int = 0
    original_doc_id: str | None = None


@dataclass
class Chunk:
    """A document chunk with content and provenance metadata."""

    content: str
    metadata: ChunkMetadata

    @property
    def id(self) -> str:
        """Generate a deterministic ID based on content hash and position."""
        content_hash = hashlib.sha256(self.content.encode("utf-8")).hexdigest()[:16]
        return f"chunk-{content_hash}-{self.metadata.chunk_index}"

    def __len__(self) -> int:
        return len(self.content)


class Chunker:
    """
    Multi-strategy document chunker with overlap and metadata preservation.

    Supports three strategies:
    - fixed_size: Split by character count with overlap
    - semantic: Split by paragraph/section boundaries
    - recursive: Progressively split by larger to smaller separators
    """

    # Markdown section headers for semantic splitting
    _SECTION_PATTERN = re.compile(r"^#{1,6}\s+.+$", re.MULTILINE)

    # Recursive splitting separators, from largest to smallest
    _RECURSIVE_SEPARATORS = [
        "\n\n\n",   # Triple newline (major sections)
        "\n\n",      # Double newline (paragraphs)
        "\n",        # Single newline (lines)
        ". ",        # Sentences
        ", ",        # Clauses
        " ",         # Words
    ]

    def chunk(
        self,
        document: str,
        strategy: ChunkingStrategy = ChunkingStrategy.RECURSIVE,
        chunk_size: int = 512,
        overlap: int = 50,
        source_file: str | None = None,
        source_url: str | None = None,
        original_doc_id: str | None = None,
    ) -> list[Chunk]:
        """
        Split a document into chunks using the specified strategy.

        Args:
            document: The full document text to chunk.
            strategy: Chunking strategy to use.
            chunk_size: Target chunk size in characters.
            overlap: Number of overlapping characters between chunks.
            source_file: Optional source file path for provenance.
            source_url: Optional source URL for provenance.
            original_doc_id: Optional original document identifier.

        Returns:
            List of Chunk objects with full provenance metadata.
        """
        if not document or not document.strip():
            return []

        if strategy == ChunkingStrategy.FIXED_SIZE:
            raw_chunks = self._chunk_fixed_size(document, chunk_size, overlap)
        elif strategy == ChunkingStrategy.SEMANTIC:
            raw_chunks = self._chunk_semantic(document, chunk_size, overlap)
        elif strategy == ChunkingStrategy.RECURSIVE:
            raw_chunks = self._chunk_recursive(document, chunk_size, overlap)
        else:
            raw_chunks = self._chunk_recursive(document, chunk_size, overlap)

        total = len(raw_chunks)
        chunks: list[Chunk] = []

        for i, (content, line_start, line_end, section_title) in enumerate(raw_chunks):
            content = content.strip()
            if not content:
                continue

            metadata = ChunkMetadata(
                source_file=source_file,
                source_url=source_url,
                line_start=line_start,
                line_end=line_end,
                section_title=section_title,
                checksum=hashlib.sha256(content.encode("utf-8")).hexdigest(),
                chunk_index=i,
                total_chunks=total,
                original_doc_id=original_doc_id,
            )
            chunks.append(Chunk(content=content, metadata=metadata))

        return chunks

    def _chunk_fixed_size(
        self, text: str, chunk_size: int, overlap: int
    ) -> list[tuple[str, int | None, int | None, str | None]]:
        """Split text into fixed-size chunks with overlap."""
        chunks: list[tuple[str, int | None, int | None, str | None]] = []
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk_text = text[start:end]

            # Calculate approximate line numbers
            line_start = text[:start].count("\n") + 1
            line_end = text[:end].count("\n") + 1

            chunks.append((chunk_text, line_start, line_end, None))

            start = end - overlap
            if start >= len(text):
                break

        return chunks

    def _chunk_semantic(
        self, text: str, chunk_size: int, overlap: int
    ) -> list[tuple[str, int | None, int | None, str | None]]:
        """Split text by semantic boundaries (sections, paragraphs)."""
        chunks: list[tuple[str, int | None, int | None, str | None]] = []

        # First try splitting by markdown headers
        sections = self._split_by_headers(text)

        current_chunk = ""
        current_title: str | None = None
        current_line_start = 1

        for section_title, section_content in sections:
            if len(current_chunk) + len(section_content) <= chunk_size:
                current_chunk += section_content
                if current_title is None:
                    current_title = section_title
            else:
                if current_chunk.strip():
                    line_end = current_line_start + current_chunk.count("\n")
                    chunks.append((current_chunk, current_line_start, line_end, current_title))
                    current_line_start = line_end + 1

                # If the section itself is too large, fall back to paragraph splitting
                if len(section_content) > chunk_size:
                    paragraphs = section_content.split("\n\n")
                    for para in paragraphs:
                        if len(para) > chunk_size:
                            # Fall back to fixed-size for oversized paragraphs
                            sub_chunks = self._chunk_fixed_size(para, chunk_size, overlap)
                            for sc in sub_chunks:
                                chunks.append((sc[0], current_line_start, current_line_start + sc[0].count("\n"), section_title))
                        else:
                            line_end = current_line_start + para.count("\n")
                            chunks.append((para, current_line_start, line_end, section_title))
                            current_line_start = line_end + 1
                    current_chunk = ""
                    current_title = None
                else:
                    current_chunk = section_content
                    current_title = section_title

        if current_chunk.strip():
            line_end = current_line_start + current_chunk.count("\n")
            chunks.append((current_chunk, current_line_start, line_end, current_title))

        return chunks

    def _chunk_recursive(
        self, text: str, chunk_size: int, overlap: int
    ) -> list[tuple[str, int | None, int | None, str | None]]:
        """Recursively split text using progressively smaller separators."""
        return self._recursive_split(text, self._RECURSIVE_SEPARATORS, chunk_size, overlap)

    def _recursive_split(
        self,
        text: str,
        separators: list[str],
        chunk_size: int,
        overlap: int,
    ) -> list[tuple[str, int | None, int | None, str | None]]:
        """Internal recursive splitting logic."""
        if len(text) <= chunk_size:
            line_start = 1
            line_end = text.count("\n") + 1
            return [(text, line_start, line_end, None)]

        # Try each separator from largest to smallest
        for sep in separators:
            if sep in text:
                parts = text.split(sep)
                chunks: list[tuple[str, int | None, int | None, str | None]] = []
                current = ""
                current_line = 1

                for part in parts:
                    candidate = current + sep + part if current else part

                    if len(candidate) <= chunk_size:
                        current = candidate
                    else:
                        if current.strip():
                            line_end = current_line + current.count("\n")
                            chunks.append((current, current_line, line_end, None))
                            current_line = line_end + 1

                        if len(part) > chunk_size:
                            # Recurse with smaller separators
                            remaining_seps = separators[separators.index(sep) + 1 :]
                            if remaining_seps:
                                sub_chunks = self._recursive_split(part, remaining_seps, chunk_size, overlap)
                                chunks.extend(sub_chunks)
                                current = ""
                            else:
                                # Last resort: fixed-size split
                                sub_chunks = self._chunk_fixed_size(part, chunk_size, overlap)
                                chunks.extend(sub_chunks)
                                current = ""
                        else:
                            current = part

                if current.strip():
                    line_end = current_line + current.count("\n")
                    chunks.append((current, current_line, line_end, None))

                return chunks

        # No separator found, fall back to fixed-size
        return self._chunk_fixed_size(text, chunk_size, overlap)

    def _split_by_headers(self, text: str) -> list[tuple[str | None, str]]:
        """Split markdown text by header boundaries."""
        matches = list(self._SECTION_PATTERN.finditer(text))

        if not matches:
            return [(None, text)]

        sections: list[tuple[str | None, str]] = []

        # Content before first header
        if matches[0].start() > 0:
            sections.append((None, text[: matches[0].start()]))

        for i, match in enumerate(matches):
            title = match.group().lstrip("#").strip()
            start = match.start()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            sections.append((title, text[start:end]))

        return sections
