# Electron IPC Protocol Specification

This document defines the Inter-Process Communication (IPC) contracts between the Electron Main process and the React Renderer process exposed via `window.electronAPI`.

---

## 1. Preload Bridge API Surface (`window.electronAPI`)

All channels are exposed securely via `contextBridge.exposeInMainWorld('electronAPI', {...})`.

---

## 2. Invocation Channels (Request -> Response)

| Channel | Method Signature | Description |
| :--- | :--- | :--- |
| `ping` | `ping(): Promise<string>` | Health check returning `'pong'`. |
| `shell:openExternal` | `openExternal(url: string): Promise<void>` | Safely opens an external URL in the system browser. |
| `shell:launchApp` | `launchApp(appName: string, args?: string): Promise<void>` | Launches a designated desktop application. |
| `notification:show` | `showNotification(title: string, body: string): Promise<void>` | Displays a native OS notification. |
| `clipboard:write` | `writeClipboard(text: string): Promise<void>` | Copies text to the OS clipboard. |
| `clipboard:read` | `readClipboard(): Promise<string>` | Reads text from the OS clipboard. |
| `backend:status` | `getBackendStatus(): Promise<{ running: boolean, port: number }>` | Checks whether FastAPI backend is responsive. |
| `orb:create` | `createOrbWindow(): Promise<void>` | Spawns the desktop floating neon orb window. |
| `orb:close` | `closeOrbWindow(): Promise<void>` | Closes or hides the orb window. |
| `orb:resize` | `resizeOrbWindow(w: number, h: number): Promise<void>` | Resizes the orb window bounds. |
| `window:focus-main` | `focusMainWindow(): Promise<void>` | Focuses and brings main application window to front. |
| `window:toggle-main` | `toggleMainWindow(): Promise<void>` | Toggles visibility of main application window. |
| `system:telemetry` | `getSystemTelemetry(): Promise<SystemTelemetry>` | Retrieves CPU, memory, and OS uptime metrics. |
| `media:control` | `controlMedia(action: MediaAction): Promise<void>` | Sends OS-level media playback keys. |

---

## 3. Push Event Subscriptions (Main -> Renderer)

### Global Shortcuts & Quick Actions
- `onToggleJarvisHUD(callback: () => void): () => void`
  - Triggered when the global shortcut (e.g. `Ctrl+Space` or `Command+Space`) is pressed to toggle the HUD.
  - Returns a cleanup unsubscribe function.

- `onQuickNote(callback: () => void): () => void`
  - Triggered by the quick-capture shortcut to immediately navigate to the note editor.
  - Returns a cleanup unsubscribe function.
