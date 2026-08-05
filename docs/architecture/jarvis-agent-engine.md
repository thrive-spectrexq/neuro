# JARVIS Agent Execution Engine Architecture

## Overview

The **JARVIS Agent Execution Engine** transforms Neuro from a passive second brain into an active, proactive desktop operating partner. It allows users to invoke voice and text commands (e.g., *"Hey Neuro"*, *"Open Brave"*, *"Add this to note"*, *"Play Starboy on Spotify"*, *"Open VSCode"*, *"Set a reminder in 15 minutes"*, *"Search quantum physics on Google"*) with zero-latency execution.

Critically, **the JARVIS Agent functions natively without requiring any external LLM API key**.

```
                           ┌──────────────────────────────────────────────┐
                           │               USER INPUT                     │
                           │   Voice Speech ("Hey Neuro") / Hotkey        │
                           │   Global Shortcut (Ctrl+Space / Alt+Space)   │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │       Renderer JarvisHUD        │
                                 │   • Web Speech API Recog/Synth  │
                                 │   • Cyber Visualizer & Ticker   │
                                 │   • Fast Command Chips          │
                                 └────────────────┬────────────────┘
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      │                                                       │
                      ▼ (IPC Bridge)                                          ▼ (HTTP POST /execute)
       ┌──────────────────────────────┐                       ┌──────────────────────────────┐
       │   Electron Main Process      │                       │      FastAPI Backend         │
       │   (Silent Background)        │                       │   (Background Supervisor)    │
       │  • BackendProcessManager     │                       │  • IntentParser (Regex Zero-Key)│
       │  • Native OS Shell & Spawner │                       │  • AgentToolsRegistry        │
       │  • Desktop Notifications     │                       │  • AgentOrchestrator         │
       │  • App Launch (Brave, VSCode)│                       │  • Note/Task/Reminder Store  │
       └──────────────────────────────┘                       └──────────────────────────────┘
```

---

## 1. Zero-Key Deterministic Intent Matching

To ensure instantaneous response times and full privacy offline, the engine uses a priority-ordered regex intent parser (`backend/app/services/agent/intent_parser.py`).

| Category | Trigger Patterns | Resolved Tool | Fallback / Behavior |
|---|---|---|---|
| **Wake & Status** | *"Hey Neuro"*, *"System status"* | `system_action` | Acknowledges wake state, reports time/uptime |
| **App Launch** | *"Open [brave/vscode/terminal/notepad/calc]"* | `open_app` | Launches OS native binary or protocol handler |
| **Media & Music** | *"Play [song/artist] on Spotify"* | `play_spotify` | Triggers `spotify:search:<query>` or desktop app |
| **Productivity** | *"Add this to note: [...]"*, *"Take a note [...]"* | `create_quick_note` | Instantly writes markdown note to database |
| **Reminders** | *"Set a reminder in [X] minutes to [...]"* | `set_reminder` | Creates timed task/alert in SQLite |
| **Web Research** | *"Search [query] on google/youtube/github"* | `web_search` | Opens default browser with targeted search URL |
| **Knowledge Base** | *"Search knowledge base for [...]"* | `search_knowledge_base` | Executes hybrid semantic/full-text query |

---

## 2. Desktop Process Lifecycle (Silent Background Supervisor)

Users should never be forced to juggle multiple terminals or inspect raw backend logs during daily use.

- **Silent Process Manager** (`apps/desktop/src/main/backend-process.ts`):
  - Automatically identifies python environment (`backend/.venv` or system python).
  - Spawns FastAPI `uvicorn` with `windowsHide: true` and redirects `stdout`/`stderr` to `.neuro/logs/backend.log`.
  - Performs non-blocking health checks against `http://127.0.0.1:8000/health`.
  - Gracefully terminates child backend processes on application exit via process tree signals.

---

## 3. Global Hotkey & Voice HUD

- **Global Hotkey:** `Ctrl + Space` or `Alt + Space` can be pressed from anywhere in the OS to summon the JARVIS Tactical HUD overlay.
- **Audio Feedback:** Real-time Text-to-Speech synthesis responds dynamically to acknowledged commands.
- **Microphone Listening:** Continuous Web Speech recognition detects spoken voice instructions and executes immediate actions.

---

## 4. Single-Command Launch

Launch Neuro with a single command:
```bash
pnpm start
# or
node scripts/launch.js
# or (Windows PowerShell)
./neuro.ps1
# or (Unix)
./neuro.sh
```
