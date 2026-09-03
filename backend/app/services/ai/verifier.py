"""
Response verification for hallucination mitigation.

Cross-checks AI-generated responses against retrieved context documents
to identify supported, unsupported, and contradicted claims.
"""

import logging
import re
from dataclasses import dataclass, field
from enum import Enum

from app.services.chunking import Chunk

logger = logging.getLogger("neuro.ai.verifier")


class ClaimStatus(str, Enum):
    SUPPORTED = "supported"
    UNSUPPORTED = "unsupported"
    CONTRADICTED = "contradicted"
    UNCERTAIN = "uncertain"


@dataclass
class ClaimVerification:
    """Verification result for a single claim."""

    claim: str
    status: ClaimStatus
    confidence: float  # 0.0 to 1.0
    supporting_evidence: list[str] = field(default_factory=list)
    source_titles: list[str] = field(default_factory=list)


@dataclass
class VerificationResult:
    """Complete verification result for a response."""

    overall_confidence: float  # 0.0 to 1.0
    claims: list[ClaimVerification] = field(default_factory=list)
    total_claims: int = 0
    supported_count: int = 0
    unsupported_count: int = 0
    contradicted_count: int = 0

    @property
    def trust_level(self) -> str:
        """Human-readable trust level based on overall confidence."""
        if self.overall_confidence >= 0.8:
            return "high"
        elif self.overall_confidence >= 0.5:
            return "medium"
        else:
            return "low"

    @property
    def has_unsupported_claims(self) -> bool:
        return self.unsupported_count > 0 or self.contradicted_count > 0


class ResponseVerifier:
    """
    Cross-checks AI claims against retrieved context documents.

    Uses a two-pass approach:
    1. Extract factual claims from the response
    2. Check each claim against context chunks using text overlap analysis

    For production use, this can be enhanced with an LLM-based verifier
    by subclassing and overriding the verify method.
    """

    # Minimum word overlap ratio to consider a claim supported
    SUPPORT_THRESHOLD = 0.4
    # Negation words that may indicate contradiction
    NEGATION_WORDS = frozenset({"not", "no", "never", "neither", "nor", "doesn't", "don't", "isn't", "wasn't", "aren't", "weren't", "cannot", "can't", "won't"})

    async def verify(
        self,
        response: str,
        context_chunks: list[Chunk],
    ) -> VerificationResult:
        """
        Verify a response against retrieved context.

        Args:
            response: The AI-generated response text.
            context_chunks: The context documents used for RAG.

        Returns:
            VerificationResult with per-claim analysis.
        """
        if not response or not context_chunks:
            return VerificationResult(
                overall_confidence=0.0 if not context_chunks else 0.5,
                total_claims=0,
            )

        claims = self._extract_claims(response)
        if not claims:
            return VerificationResult(overall_confidence=0.5, total_claims=0)

        context_texts = [chunk.content for chunk in context_chunks]
        context_titles = [
            chunk.metadata.section_title or chunk.metadata.source_file or f"chunk-{i}"
            for i, chunk in enumerate(context_chunks)
        ]

        verified_claims: list[ClaimVerification] = []
        supported = 0
        unsupported = 0
        contradicted = 0

        for claim in claims:
            verification = self._check_claim(claim, context_texts, context_titles)
            verified_claims.append(verification)

            if verification.status == ClaimStatus.SUPPORTED:
                supported += 1
            elif verification.status == ClaimStatus.UNSUPPORTED:
                unsupported += 1
            elif verification.status == ClaimStatus.CONTRADICTED:
                contradicted += 1

        total = len(verified_claims)
        overall = supported / total if total > 0 else 0.0

        return VerificationResult(
            overall_confidence=round(overall, 2),
            claims=verified_claims,
            total_claims=total,
            supported_count=supported,
            unsupported_count=unsupported,
            contradicted_count=contradicted,
        )

    def _extract_claims(self, text: str) -> list[str]:
        """
        Extract individual factual claims from text.

        Splits text into sentences and filters out questions,
        hedging language, and meta-commentary.
        """
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())

        claims: list[str] = []
        skip_patterns = [
            r'^(I think|I believe|Perhaps|Maybe|It seems|In my opinion)',
            r'^(However|But|Although|While)',
            r'\?$',  # Questions
            r'^(Here|Let me|Sure|Of course|Certainly)',
        ]

        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) < 10:
                continue

            # Skip non-factual sentences
            is_meta = any(re.match(p, sentence, re.IGNORECASE) for p in skip_patterns)
            if is_meta:
                continue

            claims.append(sentence)

        return claims

    def _check_claim(
        self,
        claim: str,
        context_texts: list[str],
        context_titles: list[str],
    ) -> ClaimVerification:
        """Check a single claim against context documents."""
        claim_words = set(self._normalize_words(claim))

        best_overlap = 0.0
        supporting_evidence: list[str] = []
        source_titles: list[str] = []
        has_negation_mismatch = False

        for ctx_text, ctx_title in zip(context_texts, context_titles):
            ctx_words = set(self._normalize_words(ctx_text))

            if not claim_words:
                continue

            # Calculate word overlap
            overlap = len(claim_words & ctx_words) / len(claim_words)

            if overlap > best_overlap:
                best_overlap = overlap

            if overlap >= self.SUPPORT_THRESHOLD:
                # Find the most relevant snippet
                snippet = self._find_best_snippet(claim, ctx_text)
                if snippet:
                    supporting_evidence.append(snippet)
                    source_titles.append(ctx_title)

                # Check for negation mismatch (simple heuristic)
                claim_negations = claim_words & self.NEGATION_WORDS
                ctx_negations = ctx_words & self.NEGATION_WORDS
                if claim_negations != ctx_negations and overlap > 0.5:
                    has_negation_mismatch = True

        if has_negation_mismatch:
            status = ClaimStatus.CONTRADICTED
            confidence = 0.3
        elif best_overlap >= self.SUPPORT_THRESHOLD:
            status = ClaimStatus.SUPPORTED
            confidence = min(best_overlap, 1.0)
        elif best_overlap >= 0.2:
            status = ClaimStatus.UNCERTAIN
            confidence = best_overlap
        else:
            status = ClaimStatus.UNSUPPORTED
            confidence = best_overlap

        return ClaimVerification(
            claim=claim,
            status=status,
            confidence=round(confidence, 2),
            supporting_evidence=supporting_evidence[:3],  # Top 3 snippets
            source_titles=source_titles[:3],
        )

    def _normalize_words(self, text: str) -> list[str]:
        """Normalize text to lowercase words, removing punctuation."""
        words = re.findall(r'\b[a-z]+\b', text.lower())
        # Remove common stop words for better signal
        stop_words = frozenset({
            "the", "a", "an", "is", "are", "was", "were", "be", "been",
            "being", "have", "has", "had", "do", "does", "did", "will",
            "would", "could", "should", "may", "might", "shall", "can",
            "to", "of", "in", "for", "on", "with", "at", "by", "from",
            "as", "into", "through", "during", "before", "after", "and",
            "or", "if", "then", "than", "that", "this", "these", "those",
            "it", "its", "they", "them", "their", "we", "our", "you",
        })
        return [w for w in words if w not in stop_words]

    def _find_best_snippet(self, claim: str, context: str, window: int = 200) -> str | None:
        """Find the most relevant snippet from context for a given claim."""
        claim_words = set(self._normalize_words(claim))
        sentences = re.split(r'(?<=[.!?])\s+', context)

        best_score = 0
        best_snippet = None

        for sentence in sentences:
            sent_words = set(self._normalize_words(sentence))
            if not sent_words:
                continue

            score = len(claim_words & sent_words) / max(len(claim_words), 1)
            if score > best_score:
                best_score = score
                best_snippet = sentence[:window]

        return best_snippet
