# Model Context Protocol (MCP) Setup Guide

Neuro includes a built-in **Model Context Protocol (MCP)** server over standard I/O (`stdio`). This allows AI editors and assistants like **Claude Desktop**, **Cursor**, and **Windsurf** to directly query your local second brain, search knowledge notes, perform graph impact analysis, and generate roadmaps.

---

## 1. Prerequisites
- Python 3.12+ installed
- Neuro backend dependencies installed (`pip install -e ".[dev]"`)

---

## 2. Configuration for AI Clients

### 2.1. Claude Desktop
Add the following to your `claude_desktop_config.json`:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "neuro": {
      "command": "python",
      "args": [
        "-m",
        "app.cli",
        "mcp"
      ],
      "cwd": "C:/Users/frimp/Documents/neuro/backend",
      "env": {
        "DATABASE_URL": "sqlite+aiosqlite:///./neuro.db",
        "PYTHONUNBUFFERED": "1"
      }
    }
  }
}
```

---

### 2.2. Cursor Editor
Add the server in Cursor Settings -> **Features** -> **MCP**:

1. Click **+ Add New MCP Server**
2. Name: `neuro`
3. Type: `command`
4. Command:
```bash
python -m app.cli mcp
```
5. Working Directory: `<YOUR_PATH_TO_NEURO>/backend`

---

### 2.3. Windsurf (Codeium)
Add to `~/.codeium/windsurf/mcp_config.json` or `%USERPROFILE%\.codeium\windsurf\mcp_config.json`:

```json
{
  "mcpServers": {
    "neuro": {
      "command": "python",
      "args": ["-m", "app.cli", "mcp"],
      "cwd": "<YOUR_PATH_TO_NEURO>/backend"
    }
  }
}
```

---

## 3. Available MCP Tools

| Tool Name | Description | Example Prompt |
| :--- | :--- | :--- |
| `search_notes` | Semantic and keyword retrieval across all notes | *"Search my notes on system architecture"* |
| `get_graph_impact` | Computes blast radius and dependency ripple effects | *"What functions depend on NoteService?"* |
| `generate_learning_roadmap` | Synthesizes a prerequisite learning DAG | *"Create a roadmap for learning Rust Async"* |
| `lint_obsidian_vault` | Audits vault for dead wikilinks and orphan notes | *"Run a diagnostic health check on my vault"* |
