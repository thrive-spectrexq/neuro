import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron';
import * as path from 'path';
import { backendProcessManager } from './backend-process';
import {
  copyClipboard,
  launchNativeApp,
  openExternalUrl,
  readClipboard,
  showDesktopNotification,
} from './os-tools';

// Enable robust software rendering if GPU context is constrained
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0b10',
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  } else {
    mainWindow.loadURL('http://localhost:3000');
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Launch FastAPI backend silently in background
  backendProcessManager.start().catch((err) => {
    console.error('[Neuro] Backend silent launch error:', err);
  });

  // 2. Create Electron Window
  createWindow();

  // 3. Register global hotkey for JARVIS Voice/HUD (Ctrl+Space / Cmd+Space)
  try {
    globalShortcut.register('CommandOrControl+Space', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('jarvis:toggle-hud');
      }
    });

    globalShortcut.register('Alt+Space', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('jarvis:toggle-hud');
      }
    });
  } catch (e) {
    console.warn('[Neuro] Could not register global shortcut:', e);
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
  backendProcessManager.stop();
});

// IPC Handlers
ipcMain.handle('ping', () => 'pong');

ipcMain.handle('shell:openExternal', async (_, url: string) => {
  return openExternalUrl(url);
});

ipcMain.handle('shell:launchApp', async (_, { appName, args }: { appName: string; args?: string }) => {
  return launchNativeApp(appName, args);
});

ipcMain.handle('notification:show', (_, { title, body }: { title: string; body: string }) => {
  showDesktopNotification(title, body);
  return true;
});

ipcMain.handle('clipboard:write', (_, text: string) => {
  copyClipboard(text);
  return true;
});

ipcMain.handle('clipboard:read', () => {
  return readClipboard();
});

ipcMain.handle('backend:status', async () => {
  const healthy = await backendProcessManager.isBackendHealthy();
  return { healthy, url: 'http://127.0.0.1:8000' };
});
