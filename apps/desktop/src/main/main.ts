import { app, BrowserWindow, globalShortcut, ipcMain, screen, session, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { backendProcessManager } from './backend-process';
import {
  controlMedia,
  copyClipboard,
  getSystemTelemetry,
  launchNativeApp,
  openExternalUrl,
  readClipboard,
  showDesktopNotification,
} from './os-tools';

// Suppress Chromium internal cloud speech recognition pipe errors
app.commandLine.appendSwitch('disable-features', 'SpeechRecognition');

let mainWindow: BrowserWindow | null = null;
let orbWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

function createTrayIcon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <circle cx="16" cy="16" r="13" fill="#07080c" stroke="#00f5ff" stroke-width="3"/>
    <circle cx="16" cy="16" r="5" fill="#00f5ff"/>
  </svg>`;
  const base64 = Buffer.from(svg).toString('base64');
  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${base64}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 850,
    minWidth: 900,
    minHeight: 600,
    title: 'Neuro — AI Second Brain',
    backgroundColor: '#07080c',
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

  let mainRetryCount = 0;
  mainWindow.webContents.on('did-fail-load', () => {
    if (mainRetryCount < 30) {
      mainRetryCount++;
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (app.isPackaged) mainWindow.loadFile(mainUrl);
          else mainWindow.loadURL(mainUrl);
        }
      }, 100);
    }
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

  const initialWidth = 380;
  const initialHeight = 460;
  const initialX = Math.round(x + width - initialWidth - 28);
  const initialY = Math.round(y + height - initialHeight - 36);

  orbWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
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

  let orbRetryCount = 0;
  orbWindow.webContents.on('did-fail-load', () => {
    if (orbRetryCount < 30) {
      orbRetryCount++;
      setTimeout(() => {
        if (orbWindow && !orbWindow.isDestroyed()) {
          orbWindow.loadURL(orbUrl);
        }
      }, 100);
    }
  });

  orbWindow.on('closed', () => {
    orbWindow = null;
  });
}

app.whenReady().then(async () => {
  // Grant microphone and notification permissions explicitly
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'notifications') {
      return callback(true);
    }
    callback(true);
  });

  session.defaultSession.setPermissionCheckHandler(() => true);

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

    globalShortcut.register('Alt+N', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('neuro:quick-note');
      }
    });

    globalShortcut.register('CommandOrControl+Shift+N', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
        mainWindow.webContents.send('neuro:quick-note');
      }
    });
  } catch (e) {
    console.warn('[Neuro] Could not register global shortcut:', e);
  }

  // 5. Initialize System Tray with Native Menu
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Neuro — AI Second Brain & Voice Agent');
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: '🚀 Open Neuro Workstation',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: '🔮 Toggle Desktop Neon Orb',
        click: () => {
          if (orbWindow && !orbWindow.isDestroyed()) {
            if (orbWindow.isVisible()) orbWindow.hide();
            else orbWindow.show();
          } else {
            createNeonOrbWindow();
          }
        },
      },
      {
        label: '🎙️ Summon JARVIS HUD (Ctrl+Space)',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('jarvis:toggle-hud');
          }
        },
      },
      {
        label: '📝 Quick Note (Alt+N)',
        click: () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
            mainWindow.webContents.send('neuro:quick-note');
          }
        },
      },
      { type: 'separator' },
      {
        label: '❌ Quit Neuro',
        click: () => {
          app.quit();
        },
      },
    ]);

    tray.setContextMenu(contextMenu);
    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      } else {
        createWindow();
      }
    });
  } catch (trayErr) {
    console.warn('[Neuro] Tray initialization notice:', trayErr);
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

ipcMain.handle(
  'shell:launchApp',
  async (_, { appName, args }: { appName: string; args?: string }) => {
    return launchNativeApp(appName, args);
  },
);

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
    const [currentX, currentY] = orbWindow.getPosition() as [number, number];
    const [currentW, currentH] = orbWindow.getSize() as [number, number];
    
    // Smoothly shift to keep bottom-right alignment anchored
    const deltaW = width - currentW;
    const deltaH = height - currentH;

    const primaryDisplay = screen.getDisplayNearestPoint({ x: currentX, y: currentY }) || screen.getPrimaryDisplay();
    const { x: workX, y: workY, width: workW, height: workH } = primaryDisplay.workArea;

    let targetX = currentX - deltaW;
    let targetY = currentY - deltaH;

    // Clamp within screen boundaries
    if (targetX < workX) targetX = workX;
    if (targetX + width > workX + workW) targetX = workX + workW - width;
    if (targetY < workY) targetY = workY;
    if (targetY + height > workY + workH) targetY = workY + workH - height;

    orbWindow.setBounds({
      x: Math.round(targetX),
      y: Math.round(targetY),
      width: Math.round(width),
      height: Math.round(height),
    });
  }
  return true;
});

ipcMain.handle('system:telemetry', () => {
  return getSystemTelemetry();
});

ipcMain.handle('media:control', async (_, action: 'playpause' | 'next' | 'prev' | 'volumeup' | 'volumedown' | 'mute') => {
  return controlMedia(action);
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
