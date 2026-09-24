# Neuro Development Roadmap

This document outlines the development phases, feature milestones, and architectural goals for **Neuro — One AI workspace for your personal agents, models, tools, and knowledge**.

---

## Progress Overview

| Phase | Description | Status | Target Timeline |
|---|---|---|---|
| **Phase 1: Core Foundation** | Local storage, note editor, bi-directional linking, full-text search | ✅ Complete | Q1 |
| **Phase 2: Knowledge Graph & Ingestion** | Entity extraction, note graph, PDF/Vault importers, web clipper integration | ✅ Complete | Q2 |
| **Phase 3: Workflows, Automations & API** | Project workspaces, task management, automation engine, tags, REST API v1 | ✅ Complete | Q3 |
| **Phase 4: Multi-Provider AI & Voice** | Hybrid vector search (ChromaDB), OpenAI/Anthropic/Ollama AI stream, voice pipeline | ✅ Complete | Q4 |
| **Phase 5: AI Workspace Platform** | Agent Fabric, Model Registry, Vision Engine, Governance, API v2, Apache 2.0 | ✅ Complete | Q1 Next Year |
| **Phase 6: Enterprise & Collaboration** | E2E encrypted sync, team workspaces, CRDT conflict resolution, enterprise packaging | 🔄 In Progress | Q2 Next Year |

---

## Detailed Milestones

### Phase 1 — Core Foundation
- [x] Markdown & Rich-text note storage (`sqlmodel` + SQLite)
- [x] Bi-directional note linking (`NoteLink` graph edges)
- [x] Full-text search engine (SQLite FTS5)
- [x] JWT authentication and password hashing (`bcrypt`)
- [x] Base desktop shell (Electron + React)

### Phase 2 — Knowledge Graph & Ingestion
- [x] Visual graph endpoint (`GET /api/v1/graph`) with note and tag node rendering
- [x] Automatic entity extraction background task
- [x] Importers for Obsidian, Notion, and Roam Research vaults
- [x] PDF ingestion and text extraction pipeline
- [x] Web clipper endpoint for browser extension integration

### Phase 3 — Workflows, Automations & API
- [x] Project workspaces with member role management (Owner, Editor, Viewer)
- [x] Task management with Kanban status transitions (`todo`, `in_progress`, `done`)
- [x] Rule-based automation engine (`AutomationRule`) with condition matching and webhook execution
- [x] Hierarchical and tag-based organization system (`Tag`, `NoteTag`)
- [x] Inline commenting and thread resolution (`Comment`)
- [x] System analytics and activity logging (`AuditLog`)

### Phase 4 — Multi-Provider AI & Real-Time Voice
- [x] ChromaDB vector indexing and hybrid search (FTS5 + Dense Embeddings)
- [x] Multi-provider AI abstraction layer (OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet, Ollama Llama 3)
- [x] Retrieval-Augmented Generation (RAG) context streaming
- [x] Text summarization and automatic tag extraction endpoints
- [x] Real-time WebSocket audio streaming pipeline (`/api/v1/voice/stream`)

### Phase 5 — AI Workspace Platform (v0.2.0)
- [x] **License migration** from MIT to Apache License 2.0
- [x] **Agent Fabric** — Multi-agent orchestration with personal agent definitions
- [x] **Tool Registry** — Composable, database-backed tool system for agents
- [x] **Model Registry** — Unified model management across all providers (local + cloud)
- [x] **Vision Engine** — Screen capture, document OCR, image analysis
- [x] **Governance Engine** — Policy framework with consent management and audit trails
- [x] **Voice Engine upgrades** — Local STT (faster-whisper) and local TTS for offline operation
- [x] **API v2** — New REST endpoints for agents, tools, models, governance, vision
- [x] **Shared types** — TypeScript type definitions for all workspace platform concepts
- [x] **Identity rebrand** — "AI Second Brain" → "AI Workspace" across all touchpoints

### Phase 6 — Enterprise & Collaboration (Active)
- [x] Client-side blob storage for encrypted synchronization (`SyncBlob`)
- [x] End-to-end zero-knowledge key exchange (`DeviceKey`, SHA-256 fingerprinting)
- [x] Workspace access audit trails & compliance exports
- [ ] Multi-device CRDT-based offline conflict resolution
- [ ] Self-hosted enterprise team server packaging
- [ ] Team agent sharing and collaborative tool registries
- [ ] SSO / SAML integration for enterprise identity providers
