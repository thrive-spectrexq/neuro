"""
Unit tests for Graph Intelligence and Codebase Knowledge Graph analysis.
"""

from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from app.services.agent.intent_parser import intent_parser
from app.services.agent.tools import agent_tools_registry
from app.services.graph_intelligence_service import (
    CodebaseGraphExtractor,
    GraphAnalyticsEngine,
    GraphWikiGenerator,
)


def test_codebase_graph_extractor_python():
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        sample_code = """
import os
from math import sqrt

class MatrixProcessor:
    \"\"\"Processes high-dimensional matrices.\"\"\"
    def compute(self, data):
        return sqrt(len(data))

def run_pipeline():
    \"\"\"Runs end to end pipeline.\"\"\"
    proc = MatrixProcessor()
    return proc.compute([1, 2, 3])
"""
        py_file = tmp_path / "processor.py"
        py_file.write_text(sample_code, encoding="utf-8")

        extracted = CodebaseGraphExtractor.extract_from_directory(str(tmp_path))
        nodes = {n["id"]: n for n in extracted["nodes"]}
        edges = extracted["edges"]

        assert "file:processor.py" in nodes
        assert "processor.py:MatrixProcessor" in nodes
        assert "processor.py:run_pipeline()" in nodes
        assert any(e["relation"] == "defines" for e in edges)
        assert any(e["relation"] == "imports" for e in edges)


def test_graph_analytics_clustering_and_god_nodes():
    nodes = [
        {"id": "core:engine", "label": "Engine", "type": "class"},
        {"id": "mod:auth", "label": "AuthService", "type": "service"},
        {"id": "mod:database", "label": "DatabasePool", "type": "database"},
        {"id": "mod:cache", "label": "RedisCache", "type": "cache"},
        {"id": "ui:view", "label": "DashboardView", "type": "component"},
    ]
    edges = [
        {"source": "mod:auth", "target": "core:engine", "relation": "depends_on"},
        {"source": "mod:database", "target": "core:engine", "relation": "depends_on"},
        {"source": "mod:cache", "target": "core:engine", "relation": "depends_on"},
        {"source": "ui:view", "target": "mod:auth", "relation": "calls"},
    ]

    G = GraphAnalyticsEngine.build_networkx_graph(nodes, edges)
    analytics = GraphAnalyticsEngine.analyze_graph(G)

    assert analytics.total_nodes == 5
    assert analytics.total_edges == 4
    assert len(analytics.god_nodes) > 0
    # Engine is connected to 3 nodes, so it has highest degree
    assert analytics.god_nodes[0]["label"] == "Engine"
    assert analytics.god_nodes[0]["degree"] == 3


def test_blast_radius_computation():
    nodes = [
        {"id": "pkg:db", "label": "DatabaseCore", "type": "database"},
        {"id": "svc:user", "label": "UserService", "type": "service"},
        {"id": "api:user_route", "label": "UserRoute", "type": "endpoint"},
        {"id": "ui:profile", "label": "ProfilePage", "type": "component"},
        {"id": "pkg:isolated", "label": "IsolatedUtil", "type": "utility"},
    ]
    edges = [
        {"source": "svc:user", "target": "pkg:db", "relation": "imports"},
        {"source": "api:user_route", "target": "svc:user", "relation": "calls"},
        {"source": "ui:profile", "target": "api:user_route", "relation": "calls"},
    ]

    G = GraphAnalyticsEngine.build_networkx_graph(nodes, edges)

    # Change DatabaseCore -> who is affected upstream?
    hits = GraphAnalyticsEngine.compute_blast_radius(G, seed_id_or_query="pkg:db", max_depth=3)
    hit_labels = {h.label: h.depth for h in hits}

    assert "UserService" in hit_labels
    assert hit_labels["UserService"] == 1
    assert "UserRoute" in hit_labels
    assert hit_labels["UserRoute"] == 2
    assert "ProfilePage" in hit_labels
    assert hit_labels["ProfilePage"] == 3
    assert "IsolatedUtil" not in hit_labels


def test_graph_wiki_generator():
    nodes = [
        {
            "id": "svc:roadmap",
            "label": "RoadmapEngine",
            "type": "service",
            "docstring": "Calculates prerequisite trees.",
        },
        {
            "id": "svc:agent",
            "label": "DeterministicAgent",
            "type": "agent",
            "docstring": "Executes desktop native tools.",
        },
    ]
    edges = [{"source": "svc:agent", "target": "svc:roadmap", "relation": "calls"}]
    G = GraphAnalyticsEngine.build_networkx_graph(nodes, edges)

    articles = GraphWikiGenerator.generate_wiki(G)
    assert "INDEX.md" in articles
    assert "RoadmapEngine" in articles["INDEX.md"]
    assert "DeterministicAgent" in articles["INDEX.md"]


@pytest.mark.asyncio
async def test_intent_parser_graph_intelligence():
    # 1. Blast Radius Intent
    intent1 = intent_parser.parse("Hey Neuro, what is the blast radius for UserService?")
    assert intent1.is_matched is True
    assert intent1.tool_name == "compute_blast_radius"
    assert "userservice" in intent1.parameters["target"].lower()

    # 2. God Nodes Intent
    intent2 = intent_parser.parse("Hey Neuro, show me the architectural keystones and god nodes")
    assert intent2.is_matched is True
    assert intent2.tool_name == "find_god_nodes"

    # 3. Analyze Graph Intent
    intent3 = intent_parser.parse("Hey Neuro, analyze the codebase graph")
    assert intent3.is_matched is True
    assert intent3.tool_name == "analyze_codebase_graph"

    # 4. Wiki Intent
    intent4 = intent_parser.parse("Hey Neuro, generate a markdown wiki for this project")
    assert intent4.is_matched is True
    assert intent4.tool_name == "generate_graph_wiki"


@pytest.mark.asyncio
async def test_agent_tools_execution_graph():
    # Test tool execution
    res_blast = await agent_tools_registry.execute("compute_blast_radius", {"target": "RoadmapService", "max_depth": 2})
    assert res_blast.success is True
    assert "count" in res_blast.data

    res_god = await agent_tools_registry.execute("find_god_nodes", {"top_n": 5})
    assert res_god.success is True
    assert "god_nodes" in res_god.data

    res_graph = await agent_tools_registry.execute("analyze_codebase_graph", {})
    assert res_graph.success is True
    assert "total_nodes" in res_graph.data

    res_wiki = await agent_tools_registry.execute("generate_graph_wiki", {})
    assert res_wiki.success is True
    assert res_wiki.data["article_count"] >= 1
