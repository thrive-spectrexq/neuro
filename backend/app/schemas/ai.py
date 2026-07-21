from pydantic import BaseModel, ConfigDict, Field, field_validator

class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="The user's chat message")
    include_context: bool = Field(default=True, description="Whether to include relevant context from notes")
    limit_context: int = Field(default=5, ge=1, le=20, description="Maximum number of context items to include")

class ChatResponse(BaseModel):
    response: str = Field(..., description="The AI's response message")
    context_used: list[str] | None = Field(default=None, description="List of note IDs or snippets used as context")

class SummarizeRequest(BaseModel):
    text: str = Field(..., min_length=10, description="The text to be summarized")

class SummarizeResponse(BaseModel):
    summary: str = Field(..., description="The resulting summary")

class ExtractTagsRequest(BaseModel):
    text: str = Field(..., min_length=5, description="The text from which to extract tags")

class ExtractTagsResponse(BaseModel):
    tags: list[str] = Field(..., description="List of extracted tags")

class AIStatusResponse(BaseModel):
    active_provider: str = Field(..., description="The currently active AI provider (e.g. openai, anthropic, ollama)")
    openai_configured: bool = Field(..., description="Whether OpenAI is configured")
    anthropic_configured: bool = Field(..., description="Whether Anthropic is configured")
    ollama_url: str = Field(..., description="URL of the Ollama instance if applicable")
    embedding_model: str = Field(..., description="Name of the currently used embedding model")
