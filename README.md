<div align="center">

# NEURO

<p><strong>One AI workspace for your personal agents, models, tools, and knowledge</strong></p>

<p>Voice, Audio & Vision · Personal Agent Fabric · Model Registry · Governance Built-In · 100% Offline Capable</p>

<p>
  <img src="https://img.shields.io/badge/AI_Workspace-Active-00f5d4?style=for-the-badge&logo=probot&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.141+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-30+-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/License-Apache_2.0-D22128?style=for-the-badge" />
</p>

</div>

---

## What is Neuro?

Neuro is an open-source, local-first AI workspace that unifies your personal agents, models, tools, and knowledge into a single platform. Voice, audio, and vision all work together — with permissions, privacy, and governance built in from the ground up.

Say *"Hey Neuro"* or press <kbd>Ctrl + Space</kbd> anywhere on your machine to summon the agent HUD. Your personal agents can open apps, play music, take notes, search your knowledge base, analyze images, and orchestrate complex multi-step workflows — all with full audit trails and consent-based governance.

```
       ┌─────────────────────────────────────────────────────────────┐
       │             "Hey Neuro, summarize my research notes"        │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                   ┌──────────────────▼──────────────────┐
                   │        NEURO AI WORKSPACE           │
                   │  • Agent Fabric & Tool Registry     │
                   │  • Model Registry (Local + Cloud)   │
                   │  • Voice, Audio & Vision Engines    │
                   │  • Governance & Audit Trail         │
                   └──────────────────┬──────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
  Knowledge Base                Personal Agents              OS Integration
  Notes · Graph · Search        Multi-Agent · Tools          Apps · Media · Screen
```

---

## Key Features

### 1. Personal Agent Fabric

- **Multi-Agent Orchestration:** Define personal agents with custom system prompts, assigned models, and curated tool sets.
- **Composable Tool Registry:** Agents use tools from a shared registry — OS tools, knowledge tools, web tools, media tools, vision tools, and custom plugins.
- **Deterministic Fast Path:** Zero-latency, zero-API-key execution for common OS commands via regex intent matching. LLM reasoning engages only when needed.
- **Agent Execution History:** Full audit trail of every agent action, tool invocation, and model call.

### 2. Model Registry

- **Bring Any Model:** Register and manage models from OpenAI, Anthropic, Google, Ollama, or any custom provider.
- **Unified Interface:** All models — chat, embedding, STT, TTS, vision, multimodal — are accessed through a single registry.
- **Local-First:** Auto-discover and register Ollama models for fully offline operation.
- **Default Model Assignment:** Set default models per capability type (chat, STT, TTS, vision, embedding).
- **Usage Tracking:** Monitor invocations, token usage, and latency per model.

### 3. Voice, Audio & Vision

- **Voice Engine:** Wake-word detection (*"Hey Neuro"*), speech-to-text, text-to-speech — with swappable models from the registry.
- **Local STT/TTS:** Offline voice via `faster-whisper` and local TTS engines. No API keys required.
- **Vision Engine:** Screen capture analysis, document OCR, image understanding via multimodal models, and visual similarity search.
- **Consent-Gated:** Voice recording and vision capture require explicit user consent through the governance system.

### 4. Knowledge Workspace

- **Notes & Documents:** Markdown and rich-text notes with bi-directional linking, tags, and full-text search (SQLite FTS5).
- **Knowledge Graph:** Entity extraction, Louvain community detection, PageRank, blast radius analysis, and wiki generation.
- **Semantic Search:** Hybrid search combining BM25 full-text with ChromaDB vector similarity.
- **Memory Store:** Persistent context and episodic memory for agents.
- **Vault Intelligence:** Broken wikilink scanner, orphan note linter, methodology router (PARA/LYT/Zettelkasten).
- **Spatial Canvas:** JSON Canvas 1.0 visual mindmap and roadmap studio.

### 5. Governance, Privacy & Permissions

- **Policy Engine:** Define policies for access control, consent requirements, data retention, and audit logging.
- **Consent Management:** Explicit opt-in consent for privacy-sensitive operations (voice recording, vision capture, cloud model usage).
- **Immutable Audit Trail:** Every agent action, model invocation, and data access is logged with governance decisions.
- **GDPR/CCPA Compliant:** Built-in data inventory, data export, and right-to-erasure endpoints.
- **Local-First Privacy:** All data stays on your machine by default. Cloud features are strictly opt-in.

### 6. OS-Native Agent Tools

- **App Launcher:** *"Open Brave"*, *"Launch VS Code"*, *"Open Terminal"*
- **Spotify Controller:** *"Play Bohemian Rhapsody on Spotify"*
- **Quick Notes:** *"Add this to note: Project roadmap specs"*
- **Reminders:** *"Set a reminder in 15 minutes to drink water"*
- **Web Research:** *"Search quantum computing on Google"*
- **Screen Capture:** *"Take a screenshot"*, *"Analyze my screen"*
- **System Control:** *"Mute volume"*, *"Lock screen"*, *"Empty recycle bin"*

### 7. Extensibility

- **Plugin SDK:** TypeScript plugin system with lifecycle hooks and isolated execution.
- **MCP Server:** Turn your workspace into an MCP tool provider for Cursor, Windsurf, and Claude Desktop.
- **REST API v1 + v2:** Full API coverage for all workspace capabilities.
- **CLI:** Command-line interface for database management, graph analysis, vault diagnostics, and MCP hosting.

### 8. Tactical HUD & Desktop Agent

- Global hotkey <kbd>Ctrl + Space</kbd> or <kbd>Alt + Space</kbd> summons the agent HUD overlay.
- Floating desktop neon orb (<kbd>Alt + O</kbd>) for always-on voice interaction.
- Live audio visualizer, speech-to-text ticker, and real-time action feedback.
- Force-directed knowledge graph, Kanban board, vault diagnostics, and canvas studio.

---

## Quick Start

```bash
# 1. Clone repository
git clone https://github.com/thrive-spectrexq/neuro.git
cd neuro

# 2. Install dependencies & build packages
pnpm install
pnpm build:packages

# 3. Setup Python backend
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

pip install -e .
cd ..

# 4. Launch Neuro AI Workspace
pnpm start
```

---

## Running Neuro

### Desktop Application (Electron + Vite + Silent FastAPI)
```bash
pnpm start
```

### CLI Commands
```bash
# Start MCP server for AI clients
neuro mcp

# Agent & Model Management
neuro models list
neuro models discover

# Vault Intelligence
neuro obsidian lint --path .
neuro obsidian search "vector BM25 retrieval" --top-k 5
neuro obsidian route "Engineering OKRs" --mode para
neuro obsidian canvas create --title "System Architecture"

# Codebase Knowledge Graph
neuro graph analyze --path .
neuro graph impact RoadmapService --depth 3
neuro graph wiki --out-dir ./wiki

# Database Management
neuro db init
neuro db seed
```

---

## Architecture

```
neuro/
├── apps/
│   ├── desktop/          # Electron desktop app (TypeScript + React)
│   ├── web/              # Browser app (TypeScript + React)
│   └── clipper/          # Browser extension for web clipping
├── backend/app/
│   ├── api/              # FastAPI route handlers (v1 + v2)
│   ├── core/             # Config, security, logging, governance middleware
│   ├── models/           # SQLModel database models
│   ├── schemas/          # Pydantic request/response schemas
│   ├── services/
│   │   ├── agent/        # Agent orchestrator, intent parser, tool registry
│   │   ├── ai/           # AI provider adapters
│   │   ├── governance/   # Policy engine, consent, audit
│   │   ├── models/       # Model registry
│   │   ├── vision/       # Vision engine, OCR
│   │   ├── voice/        # Voice pipeline, local STT/TTS
│   │   ├── search/       # Hybrid search engine
│   │   ├── memory/       # Context & episodic memory
│   │   └── ...           # Automation, ingestion, embeddings, vectorstore
│   └── workers/          # Celery background tasks
├── packages/
│   ├── ui/               # Shared React component library
│   ├── shared/           # Shared types and utilities
│   └── sdk/              # Plugin SDK
├── plugins/              # Plugin templates and examples
├── docs/                 # Architecture, API reference, guides
└── docker-compose.yml    # Redis, ChromaDB, Ollama (optional)
```

---

## Model Context Protocol (MCP) Setup

Add Neuro to your `claude_desktop_config.json` or Cursor MCP settings:

```json
{
  "mcpServers": {
    "neuro": {
      "command": "python",
      "args": ["-m", "app.mcp_server.server"],
      "cwd": "/path/to/neuro/backend"
    }
  }
}
```

---

## Configuration

Neuro works completely offline by default. Configure `.env` for optional cloud features:

```env
# Core
NEURO_ENV=development
NEURO_SECRET_KEY=your-secure-random-secret-key-32-chars-long

# Database (Default: SQLite local-first)
DATABASE_URL=sqlite:///./neuro.db

# Optional AI Providers (Bring-Your-Own-Key)
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=

# Models (used for auto-registration in model registry)
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
GOOGLE_GEMINI_MODEL=gemini-2.5-flash
OLLAMA_MODEL=llama3.2
```

---

## Documentation

- [**Architecture & System Design**](docs/ARCHITECTURE.md) — Platform architecture, governance, agent fabric, model registry
- [**Agent Fabric**](docs/architecture/agent-fabric.md) — Multi-agent orchestration, tool registry, agent lifecycle
- [**Model Registry**](docs/architecture/model-registry.md) — Model registration, discovery, invocation
- [**Governance Engine**](docs/architecture/governance-engine.md) — Policies, consent, audit trails
- [**Vision Engine**](docs/architecture/vision-engine.md) — Screen capture, OCR, image analysis
- [**MCP Server Setup**](docs/MCP_SETUP.md) — Connect Claude Desktop, Cursor, and Windsurf
- [**CLI Reference**](docs/CLI.md) — Full command documentation
- [**IPC Protocol**](docs/IPC_PROTOCOL.md) — Electron IPC message contracts
- [**API Reference**](docs/api/README.md) — REST API v1 + v2 endpoints
- [**Privacy Policy**](docs/legal/PRIVACY_POLICY.md) — Data handling and privacy commitments

---

## Testing

```bash
# Backend tests
cd backend
python -m pytest tests/ -v --cov=app

# Frontend tests
pnpm test

# Type checking
pnpm typecheck

# Linting
pnpm lint
cd backend && ruff check . && mypy app/
```

---

## License

Neuro is open-source software licensed under the [Apache License 2.0](LICENSE).
