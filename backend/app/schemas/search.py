import uuid
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator

class SearchQuery(BaseModel):
    q: str = Field(..., min_length=1, description="The search query string", examples=["database migration"])
    project_id: uuid.UUID | None = Field(default=None, description="Optional project ID to scope the search")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum number of results to return", examples=[10])
    mode: Literal['hybrid', 'fts', 'vector'] = Field(default='hybrid', description="Search mode to use", examples=["hybrid"])

    @field_validator('q')
    @classmethod
    def validate_q(cls, v: str) -> str:
        v_stripped = v.strip()
        if not v_stripped:
            raise ValueError("query cannot be empty or whitespace")
        return v_stripped

class SearchResultItem(BaseModel):
    id: uuid.UUID = Field(..., description="ID of the matching document")
    title: str = Field(..., description="Title of the matched document")
    content_snippet: str = Field(..., description="Relevant snippet from the content")
    score: float = Field(..., description="Search relevance score")
    match_type: str = Field(..., description="Type of match (e.g. note, comment, tag)")

class SearchResponse(BaseModel):
    query: str = Field(..., description="The original query")
    results: list[SearchResultItem] = Field(..., description="List of search results")
    total: int = Field(..., ge=0, description="Total number of results found")
