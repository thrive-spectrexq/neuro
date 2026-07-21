# Neuro System Architecture Overview

Neuro is an open-source, local-first AI second brain application designed to consolidate notes, research, projects, tasks, and knowledge visualization into a unified, privacy-respecting system.

---

## High-Level System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │               User Clients              │
                    │  ┌───────────────────┐ ┌──────────────┐  │
                    │  │ Desktop (Electron)│ │ Web App (Vite│  │
                    │  └─────────┬─────────┘ └──────┬───────┘  │
                    └────────────┼──────────────────┼──────────┘
                                 │ HTTP / REST      │ WebSockets
                                 ▼                  ▼
                    ┌─────────────────────────────────────────┐
                    │            Neuro FastAPI Server          │
                    │                                         │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ Auth/Users│ │  Notes   │ │Projects│  │
                    │  └───────────┘ └──────────┘ └────────┘  │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │    AI     │ │  Search  │ │  Voice │  │
                    │  └───────────┘ └──────────┘ └────────┘  │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │Automations│ │Ingestion │ │  Sync  │  │
                    │  └───────────┘ └──────────┘ └────────┘  │
                    └──────┬─────────────┬─────────────┬──────┘
                           │             │             │
              ┌────────────▼──┐   ┌──────▼──────┐  ┌───▼────────────┐
              │ SQLite / Postgres │   │  ChromaDB   │  │ Celery + Redis │
              │ (Relational Data) │   │(Vector DB)  │  │(Worker Queue)  │
              └───────────────┘   └─────────────┘  └────────────────┘
```

---

## Core System Subsystems

### 1. API Server (`backend/app/main.py`)
- Built on **FastAPI** using asynchronous Python (`asyncio`).
- Manages routing for notes, projects, tasks, tags, comments, search, AI, automations, ingestion, graph data, voice streaming, and sync blobs.
- Enforces JWT authentication, password hashing (`bcrypt`), and workspace role-based access control (RBAC).

### 2. Relational Storage Layer (`backend/app/models/`)
- Uses **SQLModel** (combining SQLAlchemy 2.0 and Pydantic v2).
- Default engine is **SQLite** for local-first operations, with full support for **PostgreSQL** in self-hosted or multi-user deployments.
- FTS5 virtual tables (`note_fts`) enable ultra-fast full-text indexing and BM25 rank scoring directly inside SQLite.

### 3. Vector Search Engine (`backend/app/services/search/`)
- Utilizes **ChromaDB** for storing vector embeddings generated from note contents and document ingests.
- Employs local transformer embeddings (e.g. `nomic-embed-text` via `sentence-transformers`) or remote embedding models.
- **Hybrid Search**: Combines FTS text relevance scores with vector similarity cosine metrics to deliver precision-grounded RAG context.

### 4. AI & RAG Engine (`backend/app/services/ai/`)
- Modular provider model supporting:
  - **Ollama**: Fully local LLM execution (`llama3`, `mistral`, etc.).
  - **OpenAI**: Cloud AI integration (`gpt-4o`, `text-embedding-3`).
  - **Anthropic**: Cloud AI integration (`claude-3-5-sonnet`).
  - **Mock / Fallback**: Safe fallback when offline or during automated testing.
- Streams responses via Server-Sent Events (SSE) and handles automatic summarization and topic tag extraction.

### 5. Automation Engine (`backend/app/services/automation/`)
- Trigger-condition-action workflow engine.
- Triggers on events like `on_note_created`, `on_tag_added`, `on_task_completed`.
- Evaluates rule conditions and executes actions asynchronously (webhooks, auto-summarization, entity extraction, tagging).

### 6. Background Worker (`backend/app/workers/`)
- Powered by **Celery** with **Redis** as broker and result backend.
- Handles heavy asynchronous operations: PDF parsing (`PyMuPDF`), vault imports (Obsidian, Notion, Roam), and batch vector re-indexing.

### 7. Real-Time Voice Streaming (`backend/app/api/routes/voice.py`)
- WebSocket endpoint for low-latency audio interaction.
- Ingests PCM audio streams from client microphones and returns AI audio response frames.

---

## Security Architecture

- **Data Privacy**: All database files, vectors, and uploads remain on the local disk by default.
- **Token Security**: OAuth2 password bearer flow issuing short-lived JWT tokens signed with SHA-256 HMAC.
- **E2E Encryption Sync**: Opt-in encrypted binary blobs (`SyncBlob`) for zero-knowledge cross-device synchronization.
