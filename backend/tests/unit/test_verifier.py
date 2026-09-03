"""
Unit tests for the hallucination verification service.
"""

import pytest

from app.services.ai.verifier import ResponseVerifier
from app.services.chunking import Chunk, ChunkMetadata


@pytest.mark.asyncio
async def test_verifier_empty_inputs():
    verifier = ResponseVerifier()
    res = await verifier.verify("", [])
    assert res.total_claims == 0
    assert res.overall_confidence == 0.0


@pytest.mark.asyncio
async def test_verifier_supported_claim():
    verifier = ResponseVerifier()

    context_chunk = Chunk(
        content="Neuro is an open-source local-first second brain platform built with FastAPI and React.",
        metadata=ChunkMetadata(source_file="architecture.md", section_title="Overview"),
    )

    response_text = "Neuro is an open-source local-first second brain platform."

    result = await verifier.verify(response_text, [context_chunk])
    assert result.total_claims >= 1
    assert result.supported_count >= 1
    assert result.overall_confidence > 0.5
    assert result.trust_level in ("high", "medium")


@pytest.mark.asyncio
async def test_verifier_contradicted_claim():
    verifier = ResponseVerifier()

    context_chunk = Chunk(
        content="The server enforces encryption at rest and TLS for all network connections.",
        metadata=ChunkMetadata(source_file="security.md"),
    )

    # Contradicting statement with negation
    response_text = "The server does not enforce encryption at rest or TLS."

    result = await verifier.verify(response_text, [context_chunk])
    assert result.total_claims >= 1
    assert result.contradicted_count >= 1
