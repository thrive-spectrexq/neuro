"""
Deterministic Contextual BM25 Vault Retrieval Engine for Neuro.

Provides offline, zero-dependency BM25 ranking across knowledge notes, markdown files, and Obsidian vaults:
- Standard Okapi BM25 ranking (k1=1.5, b=0.75)
- Contextual prefix synthesis (Title + Tags + Structural metadata)
- Snippet extraction and term match highlighting
"""

from __future__ import annotations

import math
import re
from typing import Any

from pydantic import BaseModel, Field

STOPWORDS = frozenset(
    {
        "a",
        "about",
        "above",
        "after",
        "again",
        "against",
        "all",
        "am",
        "an",
        "and",
        "any",
        "are",
        "aren't",
        "as",
        "at",
        "be",
        "because",
        "been",
        "before",
        "being",
        "below",
        "between",
        "both",
        "but",
        "by",
        "can",
        "can't",
        "cannot",
        "could",
        "did",
        "do",
        "does",
        "doing",
        "don't",
        "down",
        "during",
        "each",
        "few",
        "for",
        "from",
        "further",
        "had",
        "has",
        "have",
        "having",
        "he",
        "her",
        "here",
        "hers",
        "herself",
        "him",
        "himself",
        "his",
        "how",
        "i",
        "if",
        "in",
        "into",
        "is",
        "it",
        "its",
        "itself",
        "just",
        "me",
        "more",
        "most",
        "my",
        "myself",
        "no",
        "nor",
        "not",
        "of",
        "off",
        "on",
        "once",
        "only",
        "or",
        "other",
        "ought",
        "our",
        "ours",
        "ourselves",
        "out",
        "over",
        "own",
        "same",
        "she",
        "should",
        "so",
        "some",
        "such",
        "than",
        "that",
        "the",
        "their",
        "theirs",
        "them",
        "themselves",
        "then",
        "there",
        "these",
        "they",
        "this",
        "those",
        "through",
        "to",
        "too",
        "under",
        "until",
        "up",
        "very",
        "was",
        "we",
        "were",
        "what",
        "when",
        "where",
        "which",
        "while",
        "who",
        "whom",
        "why",
        "with",
        "would",
        "you",
        "your",
        "yours",
        "yourself",
        "yourselves",
    }
)


class RetrievalCandidate(BaseModel):
    id: str
    title: str
    score: float
    matched_terms: list[str] = Field(default_factory=list)
    snippet: str = ""
    tags: list[str] = Field(default_factory=list)


class RetrievalResult(BaseModel):
    query: str
    total_docs_scanned: int
    total_matches: int
    results: list[RetrievalCandidate] = Field(default_factory=list)


class ObsidianRetrievalService:
    @staticmethod
    def tokenize(text: str) -> list[str]:
        """Normalizes and tokenizes text into searchable word stems/tokens."""
        tokens = re.findall(r"[a-zA-Z0-9_\-]+", text.lower())
        return [t for t in tokens if len(t) > 1 and t not in STOPWORDS]

    @classmethod
    def _extract_snippet(cls, content: str, query_tokens: set[str], max_chars: int = 240) -> str:
        """Finds the most relevant paragraph or sentence window containing query terms."""
        paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
        if not paragraphs:
            return content[:max_chars].strip()

        best_p = paragraphs[0]
        max_hits = -1

        for p in paragraphs:
            p_tokens = set(cls.tokenize(p))
            hits = len(p_tokens.intersection(query_tokens))
            if hits > max_hits:
                max_hits = hits
                best_p = p

        if len(best_p) <= max_chars:
            return best_p
        return best_p[:max_chars].strip() + "..."

    @classmethod
    def search_bm25(
        cls,
        query: str,
        notes: list[dict[str, Any]],
        top_k: int = 10,
        k1: float = 1.5,
        b: float = 0.75,
    ) -> RetrievalResult:
        """
        Executes Okapi BM25 retrieval over a collection of notes with contextual prefixes.
        """
        query_tokens = cls.tokenize(query)
        if not query_tokens or not notes:
            return RetrievalResult(
                query=query,
                total_docs_scanned=len(notes),
                total_matches=0,
                results=[],
            )

        n_docs = len(notes)
        doc_tokens_list: list[list[str]] = []
        doc_lengths: list[int] = []

        # Prepare corpus and compute document lengths with contextual prefixes
        for note in notes:
            title = note.get("title") or note.get("name") or "Untitled"
            content = note.get("content") or ""
            tags = note.get("tags") or []
            tag_str = " ".join([str(t) for t in tags])

            # Contextual prefix integration
            contextual_body = f"Title: {title}. Tags: {tag_str}. {content}"
            tokens = cls.tokenize(contextual_body)
            doc_tokens_list.append(tokens)
            doc_lengths.append(len(tokens))

        avg_doc_len = sum(doc_lengths) / n_docs if n_docs > 0 else 1.0

        # Calculate Inverted Index & Document Frequencies
        df: dict[str, int] = {}
        for tokens in doc_tokens_list:
            unique_in_doc = set(tokens)
            for t in unique_in_doc:
                df[t] = df.get(t, 0) + 1

        # Calculate IDF for query tokens
        idf: dict[str, float] = {}
        for qt in query_tokens:
            n_q = df.get(qt, 0)
            # Standard Lucene/BM25 probabilistic IDF with smoothing
            idf[qt] = math.log(1.0 + (n_docs - n_q + 0.5) / (n_q + 0.5))

        # Score documents
        scored_candidates: list[RetrievalCandidate] = []
        query_set = set(query_tokens)

        for idx, note in enumerate(notes):
            tokens = doc_tokens_list[idx]
            doc_len = doc_lengths[idx]
            tf: dict[str, int] = {}
            for t in tokens:
                if t in query_set:
                    tf[t] = tf.get(t, 0) + 1

            matched = [qt for qt in query_tokens if tf.get(qt, 0) > 0]
            if not matched:
                continue

            score = 0.0
            for qt in matched:
                f_q = tf[qt]
                numerator = f_q * (k1 + 1.0)
                denominator = f_q + k1 * (1.0 - b + b * (doc_len / avg_doc_len))
                score += idf[qt] * (numerator / denominator)

            title = note.get("title") or note.get("name") or "Untitled"
            content = note.get("content") or ""
            tags = note.get("tags") or []
            snippet = cls._extract_snippet(content, query_set)

            scored_candidates.append(
                RetrievalCandidate(
                    id=str(note.get("id", idx)),
                    title=title,
                    score=round(score, 4),
                    matched_terms=list(set(matched)),
                    snippet=snippet,
                    tags=tags,
                )
            )

        # Sort descending by BM25 score
        scored_candidates.sort(key=lambda c: c.score, reverse=True)
        top_results = scored_candidates[:top_k]

        return RetrievalResult(
            query=query,
            total_docs_scanned=n_docs,
            total_matches=len(scored_candidates),
            results=top_results,
        )
