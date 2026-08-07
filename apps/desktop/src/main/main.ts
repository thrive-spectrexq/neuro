import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron';
import * as path from 'path';
import { backendProcessManager } from './backend-process';
import {
  copyClipboard,
  launchNativeApp,
  openExternalUrl,
  readClipboard,
  showDesktopNotification,
} from './os-tools';

let mainWindow: BrowserWindow | null = null;
let orbWindow: BrowserWindow | null = null;

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

  const mainUrl = app.isPackaged
    ? path.join(__dirname, '../renderer/index.html')
    : 'http://localhost:3000';

  if (app.isPackaged) {
    mainWindow.loadFile(mainUrl);
  } else {
    mainWindow.loadURL(mainUrl);
  }

  mainWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (app.isPackaged) mainWindow.loadFile(mainUrl);
        else mainWindow.loadURL(mainUrl);
      }
    }, 1200);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createNeonOrbWindow() {
  if (orbWindow && !orbWindow.isDestroyed()) {
    orbWindow.show();
    orbWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { x, y, width, height } = primaryDisplay.workArea;

  const initialSize = 150;
  const initialX = Math.round(x + width - initialSize - 24);
  const initialY = Math.round(y + height - initialSize - 24);

  orbWindow = new BrowserWindow({
    width: initialSize,
    height: initialSize,
    x: initialX,
    y: initialY,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    hasShadow: false,
    skipTaskbar: false,
    show: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  orbWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  const orbUrl = app.isPackaged
    ? `file://${path.join(__dirname, '../renderer/index.html')}?mode=orb`
    : 'http://localhost:3000/?mode=orb';

  orbWindow.loadURL(orbUrl);

  orbWindow.once('ready-to-show', () => {
    if (orbWindow && !orbWindow.isDestroyed()) {
      orbWindow.show();
      orbWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }
  });

  orbWindow.webContents.on('did-fail-load', () => {
    setTimeout(() => {
      if (orbWindow && !orbWindow.isDestroyed()) {
        orbWindow.loadURL(orbUrl);
      }
    }, 1200);
  });

  orbWindow.on('closed', () => {
    orbWindow = null;
  });
}

app.whenReady().then(async () => {
  // 1. Launch FastAPI backend silently in background
  backendProcessManager.start().catch((err) => {
    console.error('[Neuro] Backend silent launch error:', err);
  });

  // 2. Create Electron Main Workstation Window
  createWindow();

  // 3. Launch Floating Neon Voice Agent Orb directly on the PC Desktop Screen
  createNeonOrbWindow();

  // 4. Register global hotkeys for JARVIS Voice/HUD (Ctrl+Space / Cmd+Space / Alt+Space)
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createNeonOrbWindow();
    }
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

ipcMain.handle('orb:create', () => {
  createNeonOrbWindow();
  return true;
});

ipcMain.handle('orb:close', () => {
  if (orbWindow) {
    orbWindow.close();
    orbWindow = null;
  }
  return true;
});

ipcMain.handle('orb:resize', (_, { width, height }: { width: number; height: number }) => {
  if (orbWindow && !orbWindow.isDestroyed()) {
    const [currentX, currentY] = orbWindow.getPosition();
    const [currentW, currentH] = orbWindow.getSize();
    // Expand upwards & leftwards to keep anchor steady at bottom-right
    const deltaW = width - currentW;
    const deltaH = height - currentH;
    orbWindow.setBounds({
      x: currentX - deltaW,
      y: currentY - deltaH,
      width,
      height,
    });
  }
  return true;
});

ipcMain.handle('window:focus-main', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  } else {
    createWindow();
  }
  return true;
});

ipcMain.handle('window:toggle-main', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
      mainWindow.minimize();
    } else {
      mainWindow.restore();
      mainWindow.focus();
    }
  } else {
    createWindow();
  }
  return true;
});

