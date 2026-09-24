# Neuro System Architecture Overview

Neuro is an open-source, local-first AI workspace platform designed to unify personal agents, models, tools, and knowledge into a single system — with voice, audio, and vision all working together, and permissions, privacy, and governance built in.

---

## High-Level System Architecture

```
                    ┌─────────────────────────────────────────┐
                    │               User Clients              │
                    │  ┌───────────────────┐ ┌──────────────┐  │
                    │  │ Desktop (Electron)│ │ Web App (Vite│  │
                    │  └─────────┬─────────┘ └──────┬───────┘  │
                    │  ┌───────────────────┐ ┌──────────────┐  │
                    │  │ Browser Clipper   │ │   CLI        │  │
                    │  └─────────┬─────────┘ └──────┬───────┘  │
                    └────────────┼──────────────────┼──────────┘
                                 │ HTTP / REST      │ WebSockets
                                 ▼                  ▼
                    ┌─────────────────────────────────────────┐
                    │       Neuro AI Workspace API Server      │
                    │                                         │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │ Auth/RBAC │ │Governance│ │ Agents │  │
                    │  └───────────┘ └──────────┘ └────────┘  │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │  Models   │ │  Tools   │ │  Voice │  │
                    │  └───────────┘ └──────────┘ └────────┘  │
                    │  ┌───────────┐ ┌──────────┐ ┌────────┐  │
                    │  │  Vision   │ │  Search  │ │Knowledge│  │
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
- Dual API versions: **v1** (legacy compatibility) and **v2** (workspace platform features).
- Manages routing for agents, tools, models, governance, vision, notes, projects, tasks, tags, comments, search, AI, automations, ingestion, graph data, voice streaming, and sync blobs.
- Enforces JWT authentication, password hashing (`bcrypt`), and workspace role-based access control (RBAC).

### 2. Governance Engine (`backend/app/services/governance/`)
- **Policy Framework:** Define policies for access control, consent requirements, data retention, and audit logging.
- **Consent Management:** Tracks explicit user consent for privacy-sensitive operations (voice, vision, cloud models).
- **Immutable Audit Trail:** Records every governance-relevant action with policy evaluations and decisions.
- **Built-in Policies:** Default policies for voice recording consent, vision capture consent, cloud model data consent, agent action audit, and data retention.

### 3. Agent Fabric (`backend/app/services/agent/`)
- **Multi-Agent Orchestration:** Users define personal agents with custom system prompts, assigned models, and curated tool sets.
- **Tool Registry:** Database-backed registry of composable tools (OS, knowledge, web, media, vision, custom).
- **Deterministic Fast Path:** Zero-latency intent matching via regex parser — preserved from original JARVIS engine.
- **LLM Reasoning Fallback:** Engages configured LLM when deterministic matching doesn't apply.
- **Execution History:** Full audit trail of every agent execution.

### 4. Model Registry (`backend/app/services/models/`)
- **Unified Model Management:** Register, configure, and invoke models from any provider through a single interface.
- **Auto-Discovery:** Discovers locally running Ollama models automatically.
- **Default Assignment:** Set default models per capability type (chat, STT, TTS, vision, embedding).
- **Cloud models** automatically flagged as requiring consent through governance.

### 5. Voice Engine (`backend/app/services/voice/`)
- **Pipecat Pipeline:** Real-time WebSocket audio streaming with STT → LLM → TTS chain.
- **Local STT:** Offline transcription via `faster-whisper` (Whisper model).
- **Local TTS:** Offline speech synthesis via `pyttsx3` or system voices.
- **Model Registry Integration:** STT/TTS/LLM models resolved from the workspace model registry.
- **Consent-Gated:** Voice recording requires explicit governance consent.

### 6. Vision Engine (`backend/app/services/vision/`)
- **Image Analysis:** Multimodal model analysis of uploaded images with custom prompts.
- **Document OCR:** Local text extraction using EasyOCR for offline operation.
- **Screen Capture:** Desktop screen capture and analysis.
- **Consent-Gated:** Vision capture requires explicit governance consent.

### 7. Knowledge Layer
- **Relational Storage** (`backend/app/models/`): SQLModel with SQLite (local) or PostgreSQL (multi-user).
- **Vector Search** (`backend/app/services/search/`): ChromaDB for embeddings, hybrid FTS5 + vector search.
- **Knowledge Graph** (`backend/app/services/graph_intelligence_service.py`): Louvain clustering, PageRank, blast radius.
- **Memory Store** (`backend/app/services/memory/`): Persistent context and episodic memory for agents.

### 8. Extensibility
- **Plugin SDK** (`packages/sdk/`): TypeScript plugin system with lifecycle hooks.
- **MCP Server** (`backend/app/mcp_server/`): Model Context Protocol for Cursor, Windsurf, Claude Desktop.
- **Automation Engine** (`backend/app/services/automation/`): Trigger-condition-action workflows.

---

## Security Architecture

- **Data Privacy**: All database files, vectors, and uploads remain on the local disk by default.
- **Token Security**: OAuth2 password bearer flow issuing short-lived JWT tokens signed with SHA-256 HMAC.
- **E2E Encryption Sync**: Opt-in encrypted binary blobs (`SyncBlob`) for zero-knowledge cross-device synchronization.
- **Governance**: Consent-based access control for privacy-sensitive operations (voice, vision, cloud models).
- **Audit Trail**: Immutable governance audit log for all agent actions, model invocations, and data access patterns.

---

## API Surface

| Version | Prefix | Scope |
|---------|--------|-------|
| **v1** | `/api/v1/` | Notes, projects, tasks, tags, comments, search, AI, automations, ingestion, graph, voice, sync, analytics, privacy |
| **v2** | `/api/v2/` | Agents, tools, models, governance, vision |

Both API versions are served simultaneously. v1 remains fully functional for backward compatibility.
