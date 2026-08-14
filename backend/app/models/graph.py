from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from pydantic import BaseModel, Field


@dataclass
class GraphNode:
    id: str
    label: str
    type: str  # "file", "function", "class", "component", "endpoint", "note", "concept"
    source_file: str | None = None
    source_location: str | None = None
    docstring: str | None = None
    community: int | None = None
    properties: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str  # "calls", "imports", "defines", "inherits", "renders", "links_to", "depends_on"
    confidence: str = "EXTRACTED"  # "EXTRACTED", "INFERRED", "AMBIGUOUS"
    weight: float = 1.0
    properties: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class AffectedNodeHit:
    node_id: str
    label: str
    depth: int
    via_relation: str
    source_file: str | None = None
    source_location: str | None = None


class GraphCommunityModel(BaseModel):
    id: int
    label: str
    size: int
    cohesion: float
    nodes: list[str] = Field(default_factory=list)


class GraphAnalyticsReport(BaseModel):
    total_nodes: int
    total_edges: int
    density: float
    communities_count: int
    communities: dict[str, Any] = Field(default_factory=dict)
    god_nodes: list[dict[str, Any]] = Field(default_factory=list)
    circular_dependencies: list[list[str]] = Field(default_factory=list)
