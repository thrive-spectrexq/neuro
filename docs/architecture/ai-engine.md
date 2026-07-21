# AI & RAG Engine Architecture

Neuro's AI capability is designed around a **Local-First, Privacy-Preserving Retrieval-Augmented Generation (RAG)** architecture with multi-provider fallbacks.

---

## Retrieval-Augmented Generation Pipeline

```
 ┌──────────────┐      Hybrid Search      ┌──────────────────┐
 │ User Query   ├────────────────────────►│  Search Engine   │
 └──────────────┘                         └────────┬─────────┘
                                                   │
                                                   ├──────────────┐
                                                   ▼              ▼
                                           ┌──────────────┐┌─────────────┐
                                           │ SQLite FTS5  ││  ChromaDB   │
                                           └──────┬───────┘└──────┬──────┘
                                                  │               │
                                                  ▼               ▼
                                           ┌─────────────────────────────┐
                                           │ Combined Score Reranking    │
                                           └──────────────┬──────────────┘
                                                          │ Top K Notes Context
                                                          ▼
 ┌──────────────┐    Streams SSE Chunks    ┌─────────────────────────────┐
 │ Client UI    │◄─────────────────────────┤     AI Provider Stream      │
 └──────────────┘                          └─────────────────────────────┘
```

---

## Hybrid Search & Reranking

To achieve optimal retrieval precision across diverse document types:

1. **Full-Text Keyword Search (FTS5)**:
   - Queries SQLite's `note_fts` index using BM25 ranking algorithms.
   - Ideal for exact term matching, code snippets, acronyms, and proper names.

2. **Semantic Vector Search (ChromaDB)**:
   - Encodes text into 768-dimensional dense vectors using local transformers (e.g. `nomic-embed-text` or `all-MiniLM-L6-v2`).
   - Computes cosine similarity distances in vector space to capture semantic intent and related concepts.

3. **Hybrid Reranking Formula**:
   $$\text{Score}(d) = \frac{1}{1 + \text{dist}(d)} + \frac{1}{1 + \text{rank}_{\text{fts}}(d)}$$
   The top $K$ highest scoring documents are extracted and injected into the prompt's system context.

---

## Provider Abstraction Model

Neuro defines a standard abstract base class `AIProvider` (`app/services/ai/provider.py`):

```python
class AIProvider(ABC):
    @abstractmethod
    async def generate_response_stream(self, prompt: str, context: list[dict]) -> AsyncGenerator[str, None]:
        pass
```

### Supported AI Providers

| Provider | Implementation Class | Mode / Endpoint | Requirements |
|---|---|---|---|
| **Ollama** | `OllamaProvider` | Local REST (`http://localhost:11434/api/chat`) | Ollama server running locally |
| **OpenAI** | `OpenAIProvider` | Cloud API (`https://api.openai.com/v1`) | `OPENAI_API_KEY` |
| **Anthropic** | `AnthropicProvider` | Cloud API (`https://api.anthropic.com/v1`) | `ANTHROPIC_API_KEY` |
| **Mock Fallback** | `MockAIProvider` | Simulated local streaming generator | Fallback when offline / no keys |

---

## AI Helper Services

- **Summarization (`POST /api/v1/ai/summarize`)**: Distills long notes into concise 2-3 sentence overviews.
- **Tag Extraction (`POST /api/v1/ai/extract-tags`)**: Parses content to suggest 3-5 relevant taxonomy tags.
- **Entity Linking**: Identifies named entities (projects, tools, concepts) within notes to propose bi-directional `NoteLink` edges.
