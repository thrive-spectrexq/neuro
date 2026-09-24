# Agent Execution Engine Architecture

## Overview

The **Agent Execution Engine** is the core runtime of the Neuro AI Workspace. It provides a multi-agent orchestration platform where users define personal agents with custom system prompts, assigned models from the model registry, and curated tool sets from the tool registry.

The engine preserves the zero-latency deterministic fast path for common OS commands while adding full LLM-powered reasoning with function calling for complex tasks. All agent actions are recorded in the governance audit trail.

```
                           ┌──────────────────────────────────────────────┐
                           │               USER INPUT                     │
                           │   Voice Speech ("Hey Neuro") / Hotkey        │
                           │   Global Shortcut (Ctrl+Space / Alt+Space)   │
                           └──────────────────────┬───────────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │        Agent HUD / Client       │
                                 │   • Web Speech API Recog/Synth  │
                                 │   • Audio Visualizer & Ticker   │
                                 │   • Fast Command Chips          │
                                 └────────────────┬────────────────┘
                                                  │
                      ┌───────────────────────────┴───────────────────────────┐
                      │                                                       │
                      ▼ (IPC Bridge)                                          ▼ (HTTP POST /execute)
       ┌──────────────────────────────┐                       ┌──────────────────────────────┐
       │   Electron Main Process      │                       │      FastAPI Backend         │
       │   (Silent Background)        │                       │   (Background Supervisor)    │
       │  • BackendProcessManager     │                       │  • IntentParser (Fast Path)  │
       │  • Native OS Shell & Spawner │                       │  • Agent Orchestrator        │
       │  • Desktop Notifications     │                       │  • Tool Registry             │
       │  • App Launch (Brave, VSCode)│                       │  • Model Registry            │
       └──────────────────────────────┘                       │  • Governance Engine         │
                                                              └──────────────────────────────┘
```

---

## 1. Agent Fabric

Users can define multiple personal agents, each with:

- **Name & Description:** Identify the agent's purpose (e.g., "Research Agent", "Code Reviewer")
- **System Prompt:** Custom personality and behavior instructions
- **Model Assignment:** Preferred model from the model registry (chat, multimodal, etc.)
- **Tool Set:** Curated list of tools the agent can invoke
- **Permissions:** Fine-grained control over what the agent can access

Agents are stored in the database (`AgentDefinition` model) and managed through `/api/v2/agents` endpoints.

---

## 2. Zero-Key Deterministic Intent Matching

For common OS commands, the engine uses a priority-ordered regex intent parser (`backend/app/services/agent/intent_parser.py`) that executes with zero latency and zero API keys:

| Category | Trigger Patterns | Resolved Tool | Behavior |
|---|---|---|---|
| **Wake & Status** | *"Hey Neuro"*, *"System status"* | `system_action` | Acknowledges wake state, reports time/uptime |
| **App Launch** | *"Open [brave/vscode/terminal]"* | `open_app` | Launches OS native binary |
| **Media** | *"Play [song/artist] on Spotify"* | `play_spotify` | Triggers Spotify playback |
| **Notes** | *"Add this to note: [...]"* | `create_quick_note` | Writes note to database |
| **Reminders** | *"Set a reminder in [X] minutes"* | `set_reminder` | Creates timed alert |
| **Web Search** | *"Search [query] on google"* | `web_search` | Opens browser search |
| **Knowledge** | *"Search knowledge base for [...]"* | `search_knowledge_base` | Hybrid semantic/FTS query |

---

## 3. Execution Flow

1. **Agent Resolution:** Route command to the appropriate agent (or use the default agent)
2. **Governance Check:** Evaluate policies and consent for the requested action
3. **Deterministic Fast Path:** Try regex intent matching for instant execution
4. **LLM Reasoning:** If no deterministic match, invoke the agent's assigned model with function calling
5. **Tool Execution:** Execute matched tools through the tool registry
6. **Audit Trail:** Record execution details in the governance audit log

---

## 4. Desktop Process Lifecycle (Silent Background Supervisor)

- **Silent Process Manager** (`apps/desktop/src/main/backend-process.ts`):
  - Spawns FastAPI `uvicorn` with `windowsHide: true`
  - Redirects logs to `.neuro/logs/backend.log`
  - Performs non-blocking health checks
  - Gracefully terminates on application exit

---

## 5. Global Hotkey & Agent HUD

- **Global Hotkey:** `Ctrl + Space` or `Alt + Space` summons the Agent HUD overlay
- **Audio Feedback:** Real-time TTS responds to commands
- **Microphone Listening:** Continuous speech recognition for voice commands
- **Desktop Orb:** Floating neon orb (`Alt + O`) for always-on voice interaction

---

## 6. Single-Command Launch

```bash
pnpm start
# or
node scripts/launch.js
# or (Windows PowerShell)
./neuro.ps1
# or (Unix)
./neuro.sh
```
