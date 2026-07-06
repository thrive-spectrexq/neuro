<div align="center">

<h1>Neuro</h1>

<p><strong>An Open-Source, Local-First AI Second Brain</strong></p>

<p>Knowledge management · Semantic search · Research assistant · Workflow automation</p>

<p>
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-30+-47848F?logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/license-MIT-green" />
  <img src="https://img.shields.io/badge/status-pre--alpha-orange" />
</p>

</div>

---

## What is Neuro?

Knowledge is scattered. Notes live in one app, tasks in another, research across a dozen browser tabs, and important context buried in chat history. Switching between tools fractures focus and loses connections between ideas.

Neuro is a **single intelligent workspace** that brings it all together — capturing knowledge, connecting ideas, managing projects, and letting AI help you think without ever leaving your machine or surrendering your data.

```
capture → connect → search → act
```

Whether you're a researcher tracking sources, a developer documenting systems, a student building a study base, or a team managing institutional knowledge — Neuro is designed to grow with you.

---

## Core Design Principles

| Principle | What It Means |
|---|---|
| **Local First** | All data lives on your device. Sync is opt-in, never required. |
| **Privacy by Default** | No telemetry, no ads, no data sales. Ever. |
| **AI Optional** | Works fully offline. Add local or cloud AI when you want it. |
| **Open Source** | MIT licensed. Fork it, extend it, contribute back. |
| **Extensible** | Plugin architecture with a first-class SDK. |
| **Composable** | Every feature is an API. Build workflows that fit your mind. |

---

## Feature Overview

### Knowledge Management
- Markdown-first note editor with rich formatting
- Bi-directional linking between notes, projects, and entities
- Graph view for visualizing idea connections
- Hierarchical and tag-based organization
- Daily notes and journal system

### AI & Search
- Full-text and semantic (vector) search across all content
- Retrieval-Augmented Generation (RAG) for AI responses grounded in your knowledge base
- AI chat with context awareness of your notes and documents
- Support for local models via Ollama, or cloud via OpenAI/Anthropic
- Automatic summarization, extraction, and tagging

### Research & Import
- Web clipper for saving pages, highlights, and metadata
- PDF ingestion with text extraction and annotation support
- Import from Notion, Obsidian, Roam, Bear, and Markdown files
- Citation management and source tracking

### Projects & Tasks
- Project workspaces with linked notes, tasks, and files
- Kanban and list views for task management
- Deadline tracking and priority queues
- Cross-project references and dependencies

### Workflow Automation
- Trigger-based automations (on note creation, on tag, on schedule)
- Plugin hooks for custom processing pipelines
- CLI for scripting and integration with external tools
- Webhook support for external service integration

---

## Technology Stack

### Frontend (`apps/desktop`, `apps/web`)

| Layer | Technology |
|---|---|
| Language | TypeScript 5.x |
| UI Framework | React 18 |
| Desktop Shell | Electron 30+ |
| Styling | Tailwind CSS |
| State Management | Zustand |
| Data Fetching | TanStack Query |
| Editor | CodeMirror / ProseMirror |
| Graph Visualization | D3.js / Cytoscape |

### Backend (`backend/`)

| Layer | Technology |
|---|---|
| Language | Python 3.12+ |
| API Framework | FastAPI |
| ORM | SQLModel + Alembic |
| Validation | Pydantic v2 |
| Task Queue | Celery + Redis |
| Background Jobs | APScheduler |
| Auth | JWT + bcrypt |

### Storage

| Purpose | Technology |
|---|---|
| Relational data | SQLite (default) / PostgreSQL |
| Vector embeddings | ChromaDB |
| File storage | Local filesystem / S3-compatible |
| Cache | Redis |

### AI & Embeddings

| Purpose | Technology |
|---|---|
| Local inference | Ollama |
| Cloud AI | OpenAI API / Anthropic API |
| Embeddings | sentence-transformers / text-embedding-3 |
| Vector search | ChromaDB |
| RAG pipeline | LangChain / custom |

---

## Project Structure

```
neuro/
├── apps/
│   ├── desktop/                  # Electron desktop application
│   │   ├── src/
│   │   │   ├── main/             # Main process (Node.js)
│   │   │   │   └── main.ts
│   │   │   ├── preload/          # Context bridge
│   │   │   │   └── preload.ts
│   │   │   └── renderer/         # React UI
│   │   │       ├── components/
│   │   │       ├── pages/
│   │   │       ├── hooks/
│   │   │       ├── store/
│   │   │       └── App.tsx
│   │   ├── electron-builder.json
│   │   └── package.json
│   │
│   └── web/                      # Browser-based interface
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   ├── store/
│       │   └── main.tsx
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── routes/           # Endpoint routers
│   │   │   └── v1/               # Versioned API surface
│   │   ├── core/
│   │   │   ├── config.py         # Settings & env management
│   │   │   ├── security.py       # Auth, JWT, hashing
│   │   │   └── logging.py        # Structured logging
│   │   ├── models/               # SQLModel database models
│   │   ├── schemas/              # Pydantic request/response schemas
│   │   ├── services/             # Business logic layer
│   │   │   ├── ai/               # AI provider abstractions
│   │   │   ├── search/           # Full-text + vector search
│   │   │   ├── ingestion/        # Import & parsing pipelines
│   │   │   └── automation/       # Workflow automation engine
│   │   ├── workers/              # Celery background tasks
│   │   └── main.py               # FastAPI app entrypoint
│   ├── migrations/               # Alembic database migrations
│   ├── tests/
│   └── pyproject.toml
│
├── packages/
│   ├── ui/                       # Shared React component library
│   ├── shared/                   # Shared types, utils, constants
│   └── sdk/                      # Client SDK for plugin developers
│
├── plugins/
│   ├── templates/                # Starter plugin templates
│   ├── examples/                 # Reference plugin implementations
│   └── registry.json             # Community plugin index
│
├── docs/
│   ├── architecture/             # System design documents
│   ├── api/                      # API reference
│   ├── guides/                   # User and developer guides
│   └── roadmap.md
│
├── scripts/
│   ├── setup.sh
│   ├── dev.sh
│   └── build.sh
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── docker-compose.yml
├── turbo.json                    # Turborepo monorepo config
├── pnpm-workspace.yaml
├── README.md
└── LICENSE
```

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Python | 3.12+ | Backend runtime |
| Node.js | 20+ | Frontend & Electron |
| pnpm | 9+ | JS package manager |
| Redis | 7+ | Task queue & cache |
| Ollama | latest | Local AI (optional) |

### Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/thrive-spectrexq/neuro.git
cd neuro

# 2. Run the setup script (installs all dependencies)
./scripts/setup.sh

# 3. Copy environment config
cp .env.example .env

# 4. Start development servers (backend + frontend)
./scripts/dev.sh
```

The API will be available at `http://localhost:8000` and the desktop app will launch automatically.

### Manual Setup

**Backend**

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Frontend (Desktop)**

```bash
cd apps/desktop
pnpm install
pnpm dev
```

**Frontend (Web)**

```bash
cd apps/web
pnpm install
pnpm dev
```

### Docker

```bash
# Start all services
docker-compose up -d

# With local AI (Ollama)
docker-compose --profile ai up -d
```

---

## Configuration

Neuro is configured via environment variables. Copy `.env.example` to `.env` and adjust as needed.

```bash
# Core
NEURO_ENV=development
NEURO_SECRET_KEY=your-secret-key-here

# Database (default: SQLite)
DATABASE_URL=sqlite:///./neuro.db
# DATABASE_URL=postgresql://user:pass@localhost:5432/neuro

# Redis
REDIS_URL=redis://localhost:6379/0

# Vector DB
CHROMA_HOST=localhost
CHROMA_PORT=8001

# AI Providers (all optional)
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Default embedding model
EMBEDDING_MODEL=nomic-embed-text   # Ollama local model
# EMBEDDING_MODEL=text-embedding-3-small   # OpenAI
```

### AI Configuration

Neuro supports three AI modes:

**No AI** — Full functionality with no AI features enabled. Pure local knowledge management.

**Local AI (Ollama)** — Pull and run models on your machine. No data leaves your device.

```bash
ollama pull llama3.2
ollama pull nomic-embed-text   # For embeddings
```

**Cloud AI** — Set your API key in `.env` for OpenAI or Anthropic. Queries are sent to external APIs.

---

## Plugin System

Neuro has a first-class plugin architecture. Plugins can:

- Register new content types and importers
- Add custom UI panels and commands
- Hook into the automation pipeline
- Extend the AI context with custom tools

**Scaffold a new plugin:**

```bash
pnpm neuro plugin create my-plugin
```

This creates a typed plugin package in `plugins/` using the SDK from `packages/sdk`. See [Plugin Development Guide](docs/guides/plugin-development.md) for the full API reference.

**Example plugin entry point:**

```typescript
import { definePlugin } from '@neuro/sdk';

export default definePlugin({
  id: 'my-plugin',
  name: 'My Plugin',
  version: '0.1.0',
  onLoad(ctx) {
    ctx.registerImporter({
      name: 'Custom Importer',
      extensions: ['.custom'],
      parse: async (file) => { /* ... */ }
    });
  }
});
```

---

## API

The backend exposes a versioned REST API. Interactive docs are available at `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc` (ReDoc) when running in development mode.

**Key endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate and receive JWT |
| `GET` | `/api/v1/notes` | List notes with filters |
| `POST` | `/api/v1/notes` | Create a new note |
| `GET` | `/api/v1/search?q=...` | Full-text + semantic search |
| `POST` | `/api/v1/ai/chat` | AI chat with knowledge base context |
| `POST` | `/api/v1/ingest` | Import content from files or URLs |
| `GET` | `/api/v1/graph` | Knowledge graph data |

---

## Roadmap

### Phase 1 — Foundation
- [x] Core note editor (Markdown + rich text)
- [x] Bi-directional linking
- [x] Full-text search
- [x] Basic AI chat (with Ollama/OpenAI)
- [x] Local vector embeddings + semantic search
- [x] Plugin SDK v1

### Phase 2 — Knowledge Graph
- [x] Graph view (note relationships)
- [x] Automatic entity extraction and linking
- [x] Web clipper browser extension
- [x] PDF ingestion and annotation
- [x] Import from Obsidian, Notion, Roam

### Phase 3 — Projects & Workflows
- [x] Project workspaces
- [x] Task management (Kanban + lists)
- [x] Trigger-based automation engine
- [x] Webhook support
- [x] CLI for scripting and external integration

### Phase 4 — Collaboration
- [x] Optional end-to-end encrypted sync
- [x] Shared workspaces (self-hosted)
- [x] Commenting and review workflows
- [x] Audit log

---

## Contributing

Contributions are welcome. Before opening a PR, please:

1. Check existing issues and discussions to avoid duplication
2. Open an issue to discuss significant changes before implementing
3. Follow the code style — `ruff` for Python, `eslint` + `prettier` for TypeScript
4. Write tests for new functionality
5. Update documentation where relevant

**Development workflow:**

```bash
# Run all tests
./scripts/test.sh

# Python linting + formatting
cd backend && ruff check . && ruff format .

# TypeScript linting
pnpm lint

# Type checking
pnpm typecheck
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contributor guide.

---

## License

MIT License. See [LICENSE](LICENSE).


</div>
