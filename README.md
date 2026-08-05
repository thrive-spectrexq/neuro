<div align="center">

# ⚡ NEURO

<p><strong>The Open-Source, Local-First AI Second Brain & OS-Native JARVIS Voice Agent</strong></p>

<p>Zero-Latency OS Tool Calling · Voice Control · Note Graph · Semantic Search · 100% Offline Capable</p>

<p>
  <img src="https://img.shields.io/badge/JARVIS%20Agent-Active%20%26%20Native-00f5d4?style=for-the-badge&logo=probot&logoColor=black" />
  <img src="https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/Electron-30+-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-purple?style=for-the-badge" />
</p>

</div>

---

## 🌟 What is Neuro?

Neuro is a next-generation personal second brain and OS-native desktop agent inspired by **JARVIS**. It combines local-first knowledge management with an autonomous agent capable of listening to your voice and executing real operating system actions on your computer—**even without an external LLM API key**.

Say *"Neuro wake up"* or tap <kbd>Ctrl + Space</kbd> anywhere on your machine to summon the tactical HUD. Neuro can open your browser, play your music on Spotify, launch VS Code, jot down notes, schedule reminders, and query your personal knowledge base in milliseconds.

```
       ┌─────────────────────────────────────────────────────────────┐
       │              🎙️ "Neuro wake up, open Brave"                  │
       └──────────────────────────────┬──────────────────────────────┘
                                      │
                   ┌──────────────────▼──────────────────┐
                   │       NEURO JARVIS OS ENGINE        │
                   │  • Zero-Key Deterministic Matcher   │
                   │  • Voice Synthesis & Speech Recog   │
                   │  • Silent Process Supervisor        │
                   └──────────────────┬──────────────────┘
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
🚀 Open Apps (Brave/Code)     🎵 Spotify Controller       📝 Instant Notes & Tasks
```

---

## ⚡ Key Highlights

### 🤖 1. JARVIS OS-Native Agent (Zero API Key Needed)
- **Voice Wake-Word:** Speak *"Neuro wake up"*, *"Hey Neuro"*, or *"Wake up"* to activate listening mode.
- **App Launcher:** *"Open Brave"*, *"Launch VS Code"*, *"Open Terminal"*, *"Open Notepad"*, *"Open Calculator"*.
- **Spotify Music Controller:** *"Play Bohemian Rhapsody on Spotify"*, *"Play Drake in Spotify"*, *"Spotify play lofi beats"*.
- **Quick Second Brain Capture:** *"Add this to note: Project roadmap specs"*, *"Take a note meeting summary"*.
- **Timed Reminders & Alerts:** *"Set a reminder in 15 minutes to drink water"*, *"Remind me in 5 mins to call team"*.
- **Web Research Automation:** *"Search quantum computing on Google"*, *"Search YouTube for jazz"*, *"Search GitHub for FastAPI"*.
- **Local Fallback:** Runs instantly with deterministic regex parsing even if disconnected from the internet or without AI keys.

### 🚀 2. Single-Command Launch (Silent Background Supervisor)
- Launch the entire system with **one single command**:
  ```bash
  pnpm start
  ```
- **Hides backend logs completely:** The FastAPI backend starts silently in the background, supervised by Electron. No separate terminal windows or log spam.
- Logs are cleanly preserved in `.neuro/logs/backend.log` for inspection whenever needed.

### 🌌 3. Futuristic Tactical HUD
- Global hotkey <kbd>Ctrl + Space</kbd> or <kbd>Alt + Space</kbd> instantly summons the glowing cyber HUD.
- Live audio visualizer reactor, speech-to-text live ticker, and real-time action feedback cards with sound responses.

### 🧠 4. Second Brain & Knowledge Graph
- Markdown-first note editor with bi-directional wiki links (`[[Note Title]]`).
- Dynamic interactive force-directed graph view (D3.js).
- Hybrid search combining SQLite FTS5 full-text indexing and ChromaDB vector embeddings.
- Retrieval-Augmented Generation (RAG) using local Ollama models or OpenAI/Anthropic cloud keys when configured.

---

## 🚀 Quickstart (One Command)

### Windows
```powershell
# In PowerShell:
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

That's it! Neuro will boot the background supervisor, compile native bridges, start the Vite renderer, and open the desktop application with active voice listening and global hotkeys.

---

## 🗣️ Voice & Agent Command Reference

| Spoken Voice / Written Command | Action Triggered | OS / App Target |
|---|---|---|
| *"Neuro wake up"* / *"Hey Neuro"* | Wakes agent, plays audio chime, initiates listening | System State |
| *"Open Brave"* / *"Open the Brave browser"* | Launches Brave Browser instantly | Brave Browser |
| *"Open VSCode"* / *"Launch Visual Studio Code"* | Opens VS Code in current workspace | Visual Studio Code |
| *"Play [Song/Artist] on Spotify"* | Searches & plays track in Spotify | Spotify Desktop / URI |
| *"Add this to note: [Text]"* | Creates a new note in your second brain | SQLite / Markdown |
| *"Set a reminder in [X] minutes to [Task]"* | Schedules a notification alert | Task System |
| *"Search [Query] on Google"* | Opens browser with targeted search | Google Search |
| *"Search YouTube for [Topic]"* | Launches YouTube search | YouTube |
| *"Search GitHub for [Repo]"* | Searches GitHub repositories | GitHub |
| *"What time is it"* / *"System status"* | Returns system time & engine health | Diagnostics |

---

## 🏗️ Architecture

```
neuro/
├── apps/
│   └── desktop/
│       ├── src/
│       │   ├── main/
│       │   │   ├── backend-process.ts  # Silent FastAPI background process supervisor
│       │   │   ├── os-tools.ts         # Native OS bridges (apps, Spotify, notifications)
│       │   │   └── main.ts             # Global hotkey registration (Ctrl+Space)
│       │   ├── preload/
│       │   │   └── preload.ts          # Typed Electron IPC context bridge
│       │   └── renderer/
│       │       ├── components/
│       │       │   ├── JarvisHUD.tsx   # Tactical sci-fi HUD & speech visualizer
│       │       │   └── Layout.tsx      # Sidebar with JARVIS trigger & status pulse
│       │       └── hooks/
│       │           └── useJarvisAgent.ts # Web Speech API & voice execution hook
│       └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── agent.py            # /api/v1/agent/execute & /tools endpoints
│   │   │       └── voice.py            # Real-time WebSocket audio streaming
│   │   ├── services/
│   │   │   └── agent/
│   │   │       ├── intent_parser.py    # Zero-key offline deterministic regex parser
│   │   │       ├── tools.py            # OS Native Tool registry (Brave, Spotify, Code)
│   │   │       └── orchestrator.py     # Deterministic + LLM fallback coordinator
│   │   └── main.py                     # FastAPI application
│   └── tests/
│       ├── test_intent_parser.py       # Intent parser unit tests
│       └── test_agent_tools.py         # Agent execution test suite
│
├── scripts/
│   ├── launch.js                       # Cross-platform single-command runner
│   └── dev.sh
├── neuro.ps1                           # Windows single-command launcher
├── neuro.sh                            # Unix single-command launcher
└── package.json
```

For in-depth architectural details, see [docs/architecture/jarvis-agent-engine.md](docs/architecture/jarvis-agent-engine.md) and [docs/architecture/overview.md](docs/architecture/overview.md).

---

## ⚙️ Configuration & Environment

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

## 🧪 Testing

Run backend tests for the JARVIS agent and intent parser:

```bash
cd backend
python -m pytest tests/test_intent_parser.py tests/test_agent_tools.py -v
```

---

## 📄 License

Neuro is open-source software licensed under the [MIT License](LICENSE).
