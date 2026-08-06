"""
Comprehensive Unit Tests for Obsidian Intelligence, Linting, Canvas Generation, and BM25 Retrieval.
"""

from __future__ import annotations

import pytest

from app.services.agent.intent_parser import intent_parser
from app.services.obsidian_canvas_service import ObsidianCanvasService
from app.services.obsidian_lint_service import ObsidianLintService
from app.services.obsidian_mode_service import ObsidianModeService
from app.services.obsidian_retrieval_service import ObsidianRetrievalService


def test_obsidian_lint_service_detects_issues():
    notes = [
        {
            "id": "1",
            "title": "Machine Learning",
            "content": "Overview of ML.\n\n## Missing Subtopic\n\n## Valid Section\nLinks to [[Deep Learning]] and [[Unresolved Note]].",
            "created_at": "2026-01-01",
            "tags": ["ai", "ml"],
        },
        {
            "id": "2",
            "title": "Deep Learning",
            "content": "Deep neural networks.",
            "created_at": "2026-01-01",
            "tags": ["ai"],
        },
        {
            "id": "3",
            "title": "Isolated Note",
            "content": "Just an orphan note with no connections.",
            "created_at": None,  # Metadata gap
            "tags": [],
        },
    ]

    report = ObsidianLintService.lint_notes(notes, vault_name="Test-Vault")

    assert report.total_notes_scanned == 3
    # Dead links check
    assert len(report.dead_links) == 1
    assert report.dead_links[0].target == "Unresolved Note"

    # Orphans check
    assert "Isolated Note.md" in report.orphan_notes

    # Metadata gaps check
    assert any(g.file == "Isolated Note.md" for g in report.metadata_gaps)

    # Empty sections check
    assert any(s.heading == "Missing Subtopic" for s in report.empty_sections)

    # Health score check
    assert 0 <= report.health_score < 100
    assert len(report.actionable_suggestions) > 0


def test_obsidian_canvas_service_generates_valid_json_canvas():
    notes = [
        {"id": "n1", "title": "Node A", "content": "Details on Node A.", "tags": ["project"]},
        {"id": "n2", "title": "Node B", "content": "Details on Node B.", "tags": ["important"]},
    ]
    links = [{"source_id": "n1", "target_id": "n2", "relation": "depends_on"}]

    canvas_doc = ObsidianCanvasService.create_canvas_from_notes(notes, links, title="Project Architecture")

    # Has title card + 2 note cards
    assert len(canvas_doc.nodes) == 3
    assert len(canvas_doc.edges) == 1
    assert canvas_doc.edges[0]["label"] == "depends_on"

    json_output = ObsidianCanvasService.to_json(canvas_doc)
    assert '"nodes":' in json_output
    assert '"edges":' in json_output
    assert "Project Architecture" in json_output


def test_obsidian_canvas_from_roadmap():
    prereqs = [{"id": "p1", "title": "Linear Algebra", "status": "completed", "zone": "Math"}]
    unlocks = [{"id": "u1", "title": "Transformers", "zone": "NLP"}]

    canvas_doc = ObsidianCanvasService.create_canvas_from_roadmap(
        goal="Deep Learning Mastery",
        prerequisite_nodes=prereqs,
        unlock_nodes=unlocks,
    )

    assert len(canvas_doc.nodes) == 3  # Target + 1 prereq + 1 unlock
    assert len(canvas_doc.edges) == 2  # prereq -> target, target -> unlock


def test_obsidian_mode_service_routing():
    # PARA: Project with sprint/milestone
    para_res = ObsidianModeService.route_note(
        title="Launch Auth System",
        content="Sprint deliverables and milestone tasks.",
        mode="para",
    )
    assert para_res.suggested_folder == "1-Projects"
    assert "project" in para_res.suggested_tags

    # LYT: Note with MOC suggestion
    lyt_res = ObsidianModeService.route_note(
        title="Attention Mechanism",
        content="Core component of Transformer AI models.",
        mode="lyt",
    )
    assert lyt_res.suggested_folder == "notes"
    assert lyt_res.moc_recommendation is not None
    assert "MOC - AI" in lyt_res.moc_recommendation

    # Zettelkasten: Time-sortable UID
    zettel_res = ObsidianModeService.route_note(
        title="Hebbian Learning",
        content="Neurons that fire together wire together.",
        mode="zettelkasten",
    )
    assert zettel_res.suggested_folder == "permanent-notes"
    assert zettel_res.zettelkasten_uid is not None
    assert zettel_res.suggested_filename.endswith("-Hebbian Learning.md")


def test_obsidian_retrieval_bm25():
    notes = [
        {"id": "1", "title": "Graph Theory", "content": "Nodes, edges, topological sort, Dijkstra shortest path algorithm.", "tags": ["algorithms"]},
        {"id": "2", "title": "Database Indexing", "content": "B-Tree, LSM-Tree, and inverted indexes for query speed.", "tags": ["db"]},
        {"id": "3", "title": "Transformer Attention", "content": "Self-attention and multi-head attention mechanisms in LLMs.", "tags": ["ai"]},
    ]

    # Query matching note 1
    res1 = ObsidianRetrievalService.search_bm25("Dijkstra shortest path", notes, top_k=2)
    assert res1.total_matches > 0
    assert res1.results[0].title == "Graph Theory"
    assert "dijkstra" in res1.results[0].matched_terms

    # Query matching note 3
    res2 = ObsidianRetrievalService.search_bm25("multi-head attention", notes, top_k=2)
    assert res2.results[0].title == "Transformer Attention"


def test_intent_parser_obsidian_intents():
    # 21. Vault lint
    lint_intent = intent_parser.parse("Lint the obsidian vault")
    assert lint_intent.is_matched
    assert lint_intent.tool_name == "lint_vault"

    # 22. Canvas creation
    canvas_intent = intent_parser.parse("Create an obsidian canvas for Quantum Computing")
    assert canvas_intent.is_matched
    assert canvas_intent.tool_name == "create_canvas"
    assert canvas_intent.parameters.get("title") == "Quantum Computing"

    # 23. BM25 Retrieval
    bm25_intent = intent_parser.parse("BM25 search distributed consensus protocols")
    assert bm25_intent.is_matched
    assert bm25_intent.tool_name == "retrieve_vault_bm25"
    assert bm25_intent.parameters.get("query") == "distributed consensus protocols"

    # 24. Smart note routing
    route_intent = intent_parser.parse("Where should I file Graph Algorithms Handbook?")
    assert route_intent.is_matched
    assert route_intent.tool_name == "route_note"
    assert route_intent.parameters.get("title") == "Graph Algorithms Handbook"
