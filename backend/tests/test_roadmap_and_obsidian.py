import pytest
from app.services.roadmap_service import RoadmapService
from app.services.obsidian_service import ObsidianService
from app.services.agent.intent_parser import intent_parser
from app.services.agent.tools import ToolRegistry


def test_roadmap_generation_fullstack():
    roadmap = RoadmapService.generate_roadmap("Fullstack Web Development", depth="intermediate")
    assert "Fullstack Web Development" in roadmap.subject
    assert len(roadmap.nodes) > 0
    assert len(roadmap.edges) > 0
    assert roadmap.total_estimated_hours > 0
    assert roadmap.nodes[0].title != ""



def test_roadmap_prerequisites_calculation():
    roadmap = RoadmapService.generate_roadmap("Rust Systems Programming")
    nodes_dict = [n.model_dump() for n in roadmap.nodes]
    edges_dict = [e.model_dump() for e in roadmap.edges]
    last_node = nodes_dict[-1]

    prereqs = RoadmapService.get_prerequisite_path(last_node["id"], nodes_dict, edges_dict)
    assert prereqs.target_id == last_node["id"]
    assert prereqs.target_title == last_node["title"]


def test_topic_quiz_generation():
    quiz = RoadmapService.generate_topic_quiz("topic-1", "Concurrency & Multithreading")
    assert len(quiz.questions) >= 2
    assert quiz.topic_title == "Concurrency & Multithreading"
    assert len(quiz.questions[0].options) == 4
    assert 0 <= quiz.questions[0].correct_index < 4



def test_obsidian_markdown_export():
    notes = [
        {
            "id": "1",
            "title": "Quantum Computing",
            "content": "A note about [[Qubits]] and quantum superposition #quantum #physics",
            "tags": ["quantum", "physics"],
            "created_at": "2026-08-01T00:00:00Z",
            "updated_at": "2026-08-06T00:00:00Z",
        },
        {
            "id": "2",
            "title": "Qubits",
            "content": "Fundamental unit of quantum information.",
            "tags": ["quantum"],
            "created_at": "2026-08-01T00:00:00Z",
            "updated_at": "2026-08-06T00:00:00Z",
        },
    ]

    pkg = ObsidianService.export_vault(notes)
    files = pkg.files
    assert len(files) == 3  # _Map_Overview.md + 2 note files
    filepaths = [f.path for f in files]
    assert "Quantum Computing.md" in filepaths
    assert "Qubits.md" in filepaths

    # Check frontmatter and backlinks
    quantum_file = next(f for f in files if f.path == "Quantum Computing.md")
    assert "---" in quantum_file.content
    assert "tags:" in quantum_file.content
    assert "quantum" in quantum_file.content

    qubit_file = next(f for f in files if f.path == "Qubits.md")
    assert "## Linked Mentions" in qubit_file.content
    assert "[[Quantum Computing]]" in qubit_file.content



def test_obsidian_markdown_import():
    md = """---
title: Graph Algorithms
tags:
  - algorithms
  - cs
---

# Graph Algorithms

Graph theory forms the basis of network routing. See [[Dijkstra]] and [[A* Search]].
"""
    note_data = ObsidianService.parse_markdown_note("Graph Algorithms.md", md)
    assert note_data["title"] == "Graph Algorithms"
    assert "algorithms" in note_data["tags"]
    assert "cs" in note_data["tags"]
    assert "Dijkstra" in note_data["wikilinks"]
    assert "A* Search" in note_data["wikilinks"]


def test_intent_parser_roadmap_and_obsidian():
    res1 = intent_parser.parse("Hey Neuro, generate a learning roadmap for Machine Learning")
    assert res1.is_matched is True
    assert res1.tool_name == "generate_roadmap"
    assert "machine learning" in res1.parameters["goal"].lower()

    res2 = intent_parser.parse("what are the prerequisites for Advanced Quantum Mechanics")
    assert res2.is_matched is True
    assert res2.tool_name == "get_prerequisites"
    assert "quantum mechanics" in res2.parameters["topic"].lower()

    res3 = intent_parser.parse("quiz me on Distributed Systems")
    assert res3.is_matched is True
    assert res3.tool_name == "topic_quiz"
    assert "distributed systems" in res3.parameters["topic"].lower()

    res4 = intent_parser.parse("export notes to obsidian vault")
    assert res4.is_matched is True
    assert res4.tool_name == "export_obsidian"



@pytest.mark.asyncio
async def test_tool_registry_roadmap_execution():
    intent = intent_parser.parse("generate roadmap for Rust")
    result = await ToolRegistry.execute_intent(intent)
    assert result["success"] is True
    assert result["tool_name"] == "generate_roadmap"
    assert result["voice_feedback"] is not None
