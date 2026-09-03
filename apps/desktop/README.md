# @neuro/desktop

Cross-platform desktop client for Neuro built with Electron, React, TypeScript, and Vite.

## Architecture

- **Main Process (`src/main/`)**: System tray, global shortcuts (Ctrl+Space), silent background Python process lifecycle manager, IPC message router.
- **Preload Scripts (`src/preload/`)**: Context-isolated secure bridges exposing `window.neuroAPI`.
- **Renderer (`src/renderer/` & `src/components/`)**: React 18 client application with CodeMirror 6 markdown editor, D3/ForceGraph 2D graph visualization, and Zustand state stores.

## Security Constraints

In accordance with [`docs/security/HARDENING.md`](../../docs/security/HARDENING.md):
- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Restrictive Content Security Policy (CSP) applied on all web sessions
- Dangerous navigations blocked

## Development

```bash
# Start renderer in dev mode
pnpm dev

# Start Electron shell
pnpm start

# Typecheck & Run Tests
pnpm typecheck
pnpm test

# Build production distributable
pnpm build
```
