<div align="center">

# NEURO

<p><strong>The Open-Source, Local-First AI Second Brain & OS-Native Voice Agent</strong></p>

<p>Zero-Latency OS Tool Calling · Voice Control · Note Graph · Semantic Search · 100% Offline Capable</p>

<p>
  <img src="https://img.shields.io/badge/Agent-Active%20%26%20Native-00f5d4?style=for-the-badge&logo=probot&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-30+-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" />
</p>

</div>

---

## What is Neuro?

Neuro is a next-generation personal second brain and OS-native desktop agent. It combines local-first knowledge management with an autonomous agent capable of listening to your voice and executing[...]

Say *"Hey Neuro"* or tap <kbd>Ctrl + Space</kbd> anywhere on your machine to summon the tactical HUD. Neuro can open your browser, play your music on Spotify, launch VS Code, jot down notes, sched[...]

```
       ┌─────────────────────────────────────────────────────────────┐
       │                  "Hey Neuro, open Brave"                    │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                   ┌──────────────────▼──────────────────┐
                   │          NEURO OS ENGINE            │
                   │  • Zero-Key Deterministic Matcher   │
                   │  • Voice Synthesis & Speech Recog   │
                   │  • Silent Process Supervisor        │
                   └──────────────────┬──────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
Open Apps (Brave/Code)       Spotify Controller          Instant Notes & Tasks
```

---

## Key Highlights

### 1. OS-Native Agent (Zero API Key Needed)
- **Voice Wake-Word:** Speak *"Hey Neuro"* to activate listening mode.
- **App Launcher:** *"Open Brave"*, *"Launch VS Code"*, *"Open Terminal"*, *"Open Notepad"*, *"Open Calculator"*.
- **Spotify Music Controller:** *"Play Bohemian Rhapsody on Spotify"*, *"Play Drake in Spotify"*, *"Spotify play lofi beats"*.
- **Quick Second Brain Capture:** *"Add this to note: Project roadmap specs"*, *"Take a note meeting summary"*.
- **Timed Reminders & Alerts:** *"Set a reminder in 15 minutes to drink water"*, *"Remind me in 5 mins to call team"*.
- **Web Research Automation:** *"Search quantum computing on Google"*, *"Search YouTube for jazz"*, *"Search GitHub for FastAPI"*.
- **Local Fallback:** Runs instantly with deterministic regex parsing even if disconnected from the internet or without AI keys.

### 2. Knowledge Vault Intelligence & Diagnostics Engine
- **Broken Wikilink Scanner & Auto-Healer:** Automatically parses all `[[wikilinks]]`, detects broken references, suggests close match targets, and auto-heals links.
- **Orphan Note & Structure Linter:** Identifies disconnected leaf notes with 0 connections, detects empty section headings, and checks frontmatter metadata.
- **Deterministic Okapi BM25 Retrieval:** Term-weighted retrieval (k1=1.5, b=0.75) scoring across note titles, tags, and body content without requiring an external vector database.
- **Methodology Note Router:** Classifies and suggests standardized folder paths, filenames, and parent MOCs for PARA (Projects, Areas, Resources, Archives), LYT (Linking Your Thinking), and Zette[...]
- **Recoverable Plan/Apply Transactions:** Atomic file mutation operations with pre-mutation snapshots, SHA-256 checksum tracking, unified diff previews, and zero-loss rollback.
- **Vault Boundary Sandboxing:** Path traversal protection ensuring all operations strictly adhere to the designated vault root boundary.

### 3. Spatial JSON Canvas 1.0 Studio
- **Visual Mindmap & Roadmap Studio:** Infinite 2D grid viewport with pan, zoom, custom node creation (Notes, Floating Text, Concept Groups), and connection edges.
- **Native JSON Canvas Interoperability:** Export and import compliant `.canvas` files compatible with Obsidian and standard visual tools.
- **AI Roadmap Synthesis:** Automatically transforms learning goals and project milestones into visual, connected canvas dependency graphs.

### 4. Codebase Knowledge Graph & Architecture Intelligence
- **AST Multi-Language Extraction:** Analyzes Python, TypeScript, JavaScript, Rust, Go, and Markdown into unified semantic entities and dependency edges.
- **Louvain Community Detection:** Discovers functional subsystem clusters and computes cohesion and modularity metrics.
- **Keystones & God Node Centrality:** Identifies high-degree architectural keystones, bottleneck components, and bridge nodes.
- **Blast Radius & Impact Simulator:** Simulates changes to any function, class, or module and computes upstream and downstream impact trees.
- **Wikipedia-Style Markdown Wiki Generator:** Automatically converts your codebase into structured, cross-linked documentation.

### 5. Model Context Protocol (MCP) Server
- Turn your entire Neuro second-brain and knowledge graph into an MCP tool provider for **Cursor**, **Windsurf**, and **Claude Desktop**.
- Built-in tools: `neuro_search_notes`, `neuro_get_graph`, `neuro_calculate_blast_radius`, `neuro_analyze_codebase_graph`, `neuro_generate_graph_wiki`, `neuro_create_note`, `neuro_execute_system_c[...]

### 6. Single-Command Launch (Silent Background Supervisor)
- Launch the entire system with **one single command**:
  ```bash
  pnpm start
  ```
- **Hides backend logs completely:** The FastAPI backend starts silently in the background, supervised by Electron. No separate terminal windows or log spam.
- Logs are cleanly preserved in `.neuro/logs/backend.log` for inspection whenever needed.

### 7. Tactical HUD & Pro Dark Workstation
- Global hotkey <kbd>Ctrl + Space</kbd> or <kbd>Alt + Space</kbd> instantly summons the tactical HUD.
- Live audio visualizer reactor, speech-to-text live ticker, and real-time action feedback cards with voice responses.
- Interactive force-directed graph view (D3.js), Task Kanban board, Vault Diagnostics studio, and Spatial Canvas studio built on a solid `#090A0F` dark engineering surface.

---

## Quick Start / Installation

### Quick Install (One-Liner Setup)

```bash
# 1. Clone repository
git clone https://github.com/thrive-spectrexq/neuro.git
cd neuro

# 2. Install dependencies & initialize backend (Automatic)
pnpm install
pnpm build:packages

# 3. Setup Python Backend Environment
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate

pip install -e .
cd ..

# 4. Launch Neuro Desktop App
pnpm start
```

---

## Running Neuro

### Desktop Application (Vite + Electron + Silent FastAPI)
```bash
# Windows / macOS / Linux:
pnpm start
```

### Neuro CLI Commands
Neuro includes a local CLI for database management, learning roadmaps, graph intelligence, vault diagnostics, and MCP hosting:

```bash
# Start MCP server for AI clients (Cursor, Claude Desktop, Windsurf)
neuro mcp

# Vault Intelligence & Linting
neuro obsidian lint --path .
neuro obsidian search "vector BM25 retrieval" --top-k 5
neuro obsidian route "Engineering OKRs" --mode para
neuro obsidian canvas create --title "System Architecture"

# Codebase Knowledge Graph & Community Analysis
neuro graph analyze --path .
neuro graph impact RoadmapService --depth 3
neuro graph wiki --out-dir ./wiki

# Interactive Prerequisite DAG Roadmap
neuro roadmap "Deep Learning & Transformers" --depth advanced

# Initialize or seed database
neuro db init
neuro db seed
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

## Voice & Agent Command Reference

| Spoken Voice / Written Command | Action Triggered | OS / App Target |
|---|---|---|
| *"Hey Neuro"* | Wakes agent, plays audio chime, initiates listening | System State |
| *"Open Brave"* / *"Launch Chrome"* | Launches browser application | Browser |
| *"Open VSCode"* / *"Launch Terminal"* | Opens code editor or terminal | Developer Tools |
| *"Open Downloads"* / *"Open Documents"* | Opens folder in file explorer | File System |
| *"Play [Song/Artist] on Spotify"* | Searches & plays track in Spotify | Spotify Desktop / Web |
| *"Mute volume"* / *"Set volume to 50%"* | Controls master audio levels | System Audio |
| *"Take a screenshot"* / *"Capture screen"* | Captures display and saves to desktop | OS Display |
| *"Lock screen"* / *"Lock my PC"* | Immediately locks the workstation | Security / OS |
| *"Empty recycle bin"* / *"Clean trash"* | Empties deleted files safely | System Storage |
| *"What is the blast radius for [Symbol]"* | Calculates upstream/downstream dependency impact | Graph Intelligence |
| *"Show god nodes / architectural keystones"* | Analyzes structural bottlenecks and central hubs | Graph Intelligence |
| *"Analyze codebase graph"* | Performs Louvain community clustering & metrics | Graph Intelligence |
| *"Generate markdown wiki"* | Creates Wikipedia-style docs in markdown | Graph Intelligence |
| *"Add this to note: [Text]"* | Creates a new note in your second brain | SQLite / Markdown |
| *"Set a reminder in [X] mins to [Task]"* | Schedules a notification alert | Task System |
| *"Search [Query] on Google"* | Opens browser with targeted search | Google Search |
| *"Search YouTube for [Topic]"* | Launches YouTube video search | YouTube |
| *"Search GitHub for [Repo]"* | Searches GitHub repositories | GitHub |
| *"Calculate (450 * 12) + 80"* | Safely computes mathematical expression | AST Math Engine |
| *"Flip a coin"* / *"Roll a die"* | Random decision & number generation | Local Logic |
| *"What time is it"* / *"System status"* | Returns system time & engine health | Diagnostics |

---

## Configuration & Environment

Neuro works completely offline by default. To optionally enable cloud AI models or custom storage, configure `.env`:

```env
# Core
NEURO_ENV=development
NEURO_SECRET_KEY=your-secure-random-secret-key-32-chars-long

# Database (Default: SQLite local-first)
DATABASE_URL=sqlite:///./neuro.db

# Optional AI Providers (For complex conversational RAG)
OLLAMA_BASE_URL=http://localhost:11434
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GEMINI_API_KEY=

# Models
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
GOOGLE_GEMINI_API_KEY=gemini-2.5-flash
OLLAMA_MODEL=llama3.2
```

---

## Documentation

For in-depth architecture and integration guides, see:
- [**Architecture & System Design**](docs/ARCHITECTURE.md) — Knowledge graph extraction, Louvain clustering, PageRank, and vault sandboxing.
- [**MCP Server Setup**](docs/MCP_SETUP.md) — Connect Claude Desktop, Cursor, and Windsurf directly to your Neuro second brain.
- [**CLI Reference Manual**](docs/CLI.md) — Full command documentation for `neuro db`, `neuro graph`, `neuro obsidian`, and `neuro roadmap`.
- [**IPC Protocol Specification**](docs/IPC_PROTOCOL.md) — Electron IPC message contracts, telemetry channels, and push events.
- [**API Reference**](docs/api/README.md) — REST API endpoints and schemas.

---

## Testing

Run backend tests for the agent, intent parser, graph intelligence, vault transactions, and diagnostics:

```bash
cd backend
python -m pytest tests/ -v --cov=app
```

---

## License

Neuro is open-source software licensed under the [MIT License](LICENSE).
