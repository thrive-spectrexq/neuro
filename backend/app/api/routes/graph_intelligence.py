"""
API Routes for Graph Intelligence and Codebase Knowledge Graphs.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.graph_intelligence_service import (
    GraphAnalyticsEngine,
    graph_analytics,
    graph_extractor,
    graph_wiki_gen,
)

router = APIRouter(tags=["graph-intelligence"])


class ExtractGraphRequest(BaseModel):
    root_path: str | None = Field(
        None, description="Absolute path or relative directory to scan. Defaults to repository root."
    )
    max_files: int = Field(500, ge=1, le=2000, description="Max files to scan.")


class AnalyzeGraphRequest(BaseModel):
    nodes: list[dict[str, Any]] = Field(..., description="List of graph node dicts")
    edges: list[dict[str, Any]] = Field(..., description="List of graph edge dicts")
    resolution: float = Field(1.0, ge=0.1, le=10.0, description="Louvain community detection resolution")


class ImpactAnalysisRequest(BaseModel):
    seed: str = Field(..., description="Node ID, symbol name, or file path to evaluate blast radius for")
    max_depth: int = Field(3, ge=1, le=10, description="Max BFS/DFS traversal depth")
    nodes: list[dict[str, Any]] | None = None
    edges: list[dict[str, Any]] | None = None


class WikiGenerationRequest(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    out_dir: str | None = None


@router.post("/extract")
async def extract_knowledge_graph(request: ExtractGraphRequest) -> dict[str, Any]:
    """Scans and extracts semantic knowledge graph from repository files (Python AST, JS/TS, Markdown, etc.)."""
    import os

    target_path = request.root_path or os.getcwd()
    try:
        data = graph_extractor.extract_from_directory(target_path, max_files=request.max_files)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze")
async def analyze_graph_structure(request: AnalyzeGraphRequest) -> dict[str, Any]:
    """Runs Louvain community detection, God node centrality ranking, and architectural diagnostics."""
    try:
        G = GraphAnalyticsEngine.build_networkx_graph(request.nodes, request.edges)
        result = graph_analytics.analyze_graph(G)
        return {
            "success": True,
            "analytics": {
                "total_nodes": result.total_nodes,
                "total_edges": result.total_edges,
                "density": result.density,
                "communities_count": result.communities_count,
                "communities": result.communities,
                "god_nodes": result.god_nodes,
                "circular_dependencies": result.circular_dependencies,
                "bridge_nodes": result.bridge_nodes,
                "isolated_nodes": result.isolated_nodes,
            },
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Graph analysis failed: {str(e)}")


@router.post("/impact")
async def compute_change_impact(request: ImpactAnalysisRequest) -> dict[str, Any]:
    """Calculates blast radius (upstream callers & downstream dependencies) for a given symbol or file."""
    try:
        if request.nodes and request.edges:
            G = GraphAnalyticsEngine.build_networkx_graph(request.nodes, request.edges)
        else:
            import os

            extracted = graph_extractor.extract_from_directory(os.getcwd(), max_files=300)
            G = GraphAnalyticsEngine.build_networkx_graph(extracted["nodes"], extracted["edges"])

        hits = graph_analytics.compute_blast_radius(G, seed_id_or_query=request.seed, max_depth=request.max_depth)
        return {
            "success": True,
            "seed": request.seed,
            "impact_count": len(hits),
            "impacted_nodes": [
                {
                    "node_id": h.node_id,
                    "label": h.label,
                    "depth": h.depth,
                    "via_relation": h.via_relation,
                    "source_file": h.source_file,
                    "source_location": h.source_location,
                }
                for h in hits
            ],
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Impact computation failed: {str(e)}")


@router.post("/wiki")
async def generate_markdown_wiki(request: WikiGenerationRequest) -> dict[str, Any]:
    """Generates Wikipedia-style Markdown documentation with cross-links from a knowledge graph."""
    try:
        G = GraphAnalyticsEngine.build_networkx_graph(request.nodes, request.edges)
        articles = graph_wiki_gen.generate_wiki(G, out_dir=request.out_dir)
        return {"success": True, "article_count": len(articles), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Wiki generation failed: {str(e)}")
