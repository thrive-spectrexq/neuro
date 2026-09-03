"""
Unit tests for the document chunking service.
"""

from app.services.chunking import Chunker, ChunkingStrategy


def test_chunker_empty_input():
    chunker = Chunker()
    assert chunker.chunk("") == []
    assert chunker.chunk("   ") == []


def test_chunker_fixed_size():
    chunker = Chunker()
    text = "A" * 500
    chunks = chunker.chunk(
        text,
        strategy=ChunkingStrategy.FIXED_SIZE,
        chunk_size=100,
        overlap=20,
        source_file="test.md",
    )
    assert len(chunks) > 1
    for chunk in chunks:
        assert len(chunk.content) <= 100
        assert chunk.metadata.source_file == "test.md"
        assert len(chunk.metadata.checksum) == 64  # SHA256 hex


def test_chunker_semantic_headers():
    chunker = Chunker()
    markdown = """# Section 1
This is introductory content.

## Subsection 1.1
Detailed explanations here.

# Section 2
Concluding remarks and summaries.
"""
    chunks = chunker.chunk(
        markdown,
        strategy=ChunkingStrategy.SEMANTIC,
        chunk_size=120,
        overlap=10,
    )
    assert len(chunks) >= 2
    # Ensure titles were extracted
    titles = [c.metadata.section_title for c in chunks if c.metadata.section_title]
    assert any("Section" in t for t in titles)


def test_chunker_recursive_splitting():
    chunker = Chunker()
    text = (
        "First paragraph with some details.\n\n"
        "Second paragraph with more elaborate explanation and examples.\n\n"
        "Third paragraph concluding the note."
    )
    chunks = chunker.chunk(
        text,
        strategy=ChunkingStrategy.RECURSIVE,
        chunk_size=80,
        overlap=10,
    )
    assert len(chunks) >= 2
    for chunk in chunks:
        assert chunk.metadata.total_chunks == len(chunks)
        assert chunk.id.startswith("chunk-")
