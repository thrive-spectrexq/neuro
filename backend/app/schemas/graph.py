from typing import Literal, Any
from pydantic import BaseModel, ConfigDict, Field

class GraphNode(BaseModel):
    id: str = Field(..., min_length=1, description="Unique node identifier")
    name: str = Field(..., min_length=1, description="Display name of the node")
    type: Literal['note', 'tag', 'entity'] = Field(..., description="Type of the node")
    metadata: dict[str, Any] | None = Field(default=None, description="Optional metadata associated with the node")

class GraphEdge(BaseModel):
    source: str = Field(..., min_length=1, description="Source node ID")
    target: str = Field(..., min_length=1, description="Target node ID")
    type: str = Field(default='link', description="Type of edge relationship")

class GraphResponse(BaseModel):
    nodes: list[GraphNode] = Field(..., description="List of graph nodes")
    edges: list[GraphEdge] = Field(..., description="List of graph edges")
