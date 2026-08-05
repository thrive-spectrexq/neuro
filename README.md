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

Neuro is a next-generation personal second brain and OS-native desktop agent. It combines local-first knowledge management with an autonomous agent capable of listening to your voice and executing real operating system actions on your computer—**even without an external LLM API key**.

Say *"Hey Neuro"* or tap <kbd>Ctrl + Space</kbd> anywhere on your machine to summon the tactical HUD. Neuro can open your browser, play your music on Spotify, launch VS Code, jot down notes, schedule reminders, and query your personal knowledge base in milliseconds.

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

### 2. Single-Command Launch (Silent Background Supervisor)
- Launch the entire system with **one single command**:
  ```bash
  pnpm start
  ```
- **Hides backend logs completely:** The FastAPI backend starts silently in the background, supervised by Electron. No separate terminal windows or log spam.
- Logs are cleanly preserved in `.neuro/logs/backend.log` for inspection whenever needed.

### 3. Tactical HUD
- Global hotkey <kbd>Ctrl + Space</kbd> or <kbd>Alt + Space</kbd> instantly summons the HUD.
- Live audio visualizer reactor, speech-to-text live ticker, and real-time action feedback cards with sound responses.

### 4. Second Brain & Knowledge Graph
- Markdown-first note editor with bi-directional wiki links (`[[Note Title]]`).
- Dynamic interactive force-directed graph view (D3.js).
- Hybrid search combining SQLite FTS5 full-text indexing and ChromaDB vector embeddings.
- Retrieval-Augmented Generation (RAG) using local Ollama models or OpenAI/Anthropic cloud keys when configured.

---

## Getting Started

### Prerequisites
- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 (`npm install -g pnpm`)
- **Python** >= 3.12 (or [uv](https://docs.astral.sh/uv/) package manager)

### Installation & Setup

```bash
# 1. Clone the repository
git clone https://github.com/thrive-spectrexq/neuro.git
cd neuro

# 2. Install monorepo dependencies
pnpm install

# 3. Setup Python Backend Environment
# Using uv (Recommended - ultra fast):
cd backend
uv venv
uv pip install -e .
cd ..

# Or using standard python & pip:
cd backend
python -m venv .venv
# On Windows (PowerShell):
.\.venv\Scripts\activate
# On macOS / Linux:
source .venv/bin/activate
pip install -e .
cd ..
```

---

## Launch (One Command)

### Windows
```powershell
# PowerShell:
./neuro.ps1
# or
pnpm start
```

### macOS / Linux
```bash
chmod +x ./neuro.sh
./neuro.sh
# or
pnpm start
```

Neuro will automatically boot the background FastAPI engine silently, link the native OS hooks, launch the Vite renderer, and open the desktop application with active voice listening and global hotkeys (<kbd>Ctrl + Space</kbd>).

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

# Models
OPENAI_MODEL=gpt-4o
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
OLLAMA_MODEL=llama3.2
```

---

## Testing

Run backend tests for the agent and intent parser:

```bash
cd backend
python -m pytest tests/test_intent_parser.py tests/test_agent_tools.py -v
```

---

## License

Neuro is open-source software licensed under the [MIT License](LICENSE).
