#!/usr/bin/env node
/**
 * NEURO LIGHTNING SINGLE-COMMAND LAUNCHER
 * Instant startup: launches Vite, Backend, and Electron in parallel with 0s latency.
 */

const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const desktopDir = path.join(rootDir, 'apps', 'desktop');
const logsDir = path.join(rootDir, '.neuro', 'logs');

console.log('\x1b[35m%s\x1b[0m', '════════════════════════════════════════════════════════════');
console.log('\x1b[36m%s\x1b[0m', '  ⚡ NEURO — AI Second Brain & Floating Desktop Neon Orb');
console.log('\x1b[35m%s\x1b[0m', '════════════════════════════════════════════════════════════\n');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 1. Python Backend Executable Finder
function findPythonExec() {
  const isWindows = process.platform === 'win32';
  const venvWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const venvPosix = path.join(backendDir, '.venv', 'bin', 'python');

  if (isWindows && fs.existsSync(venvWin)) return venvWin;
  if (!isWindows && fs.existsSync(venvPosix)) return venvPosix;
  return isWindows ? 'python' : 'python3';
}

// 2. Health check helper
function checkHttpPort(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}${path}`, { timeout: 300 }, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Rotate log files if they exceed 10MB (keeps up to 5 backups)
function rotateLogs(logFilePath, maxBackups = 5, maxSizeBytes = 10 * 1024 * 1024) {
  try {
    if (!fs.existsSync(logFilePath)) return;
    const stats = fs.statSync(logFilePath);
    if (stats.size < maxSizeBytes) return;

    for (let i = maxBackups - 1; i >= 1; i--) {
      const src = `${logFilePath}.${i}`;
      const dest = `${logFilePath}.${i + 1}`;
      if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
      }
    }
    fs.renameSync(logFilePath, `${logFilePath}.1`);
  } catch (err) {
    console.warn('[Neuro] Log rotation notice:', err.message);
  }
}

// 3. Launch Backend in Parallel
function startBackendAsync(pythonExec) {
  const logFilePath = path.join(logsDir, 'backend.log');
  rotateLogs(logFilePath);

  const backendLog = fs.createWriteStream(logFilePath, { flags: 'a' });
  const backendProc = spawn(pythonExec, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });

  backendProc.stdout.pipe(backendLog);
  backendProc.stderr.pipe(backendLog);
  backendProc.on('error', (err) => {
    console.warn('[Neuro] Backend process warning:', err.message);
  });
  return backendProc;
}

// 4. Ensure Main Process is compiled
function ensureMainCompiled() {
  const mainDist = path.join(desktopDir, 'dist', 'main', 'main.js');
  if (!fs.existsSync(mainDist)) {
    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    console.log('\x1b[34mℹ\x1b[0m Initializing Electron main build...');
    try {
      execSync(`${npxCmd} tsc -p tsconfig.main.json`, { cwd: desktopDir, stdio: 'inherit' });
    } catch (e) {
      console.warn('[Neuro] TypeScript warning:', e.message);
    }
  }
}

async function main() {
  const isWindows = process.platform === 'win32';

  // 1. Ensure Electron main bridge exists
  ensureMainCompiled();

  // 2. Launch Silent Backend in background (Non-blocking)
  const isBackendRunning = await checkHttpPort(8000, '/health');
  let backendProc = null;
  if (!isBackendRunning) {
    const pythonExec = findPythonExec();
    backendProc = startBackendAsync(pythonExec);
    console.log('\x1b[32m✔\x1b[0m Silent FastAPI Agent backend starting in background.');
  } else {
    console.log('\x1b[32m✔\x1b[0m Backend already active on http://127.0.0.1:8000');
  }

  // 3. Resolve Electron binary
  let electronExe = null;
  try {
    const electronModulePath = require.resolve('electron', { paths: [desktopDir, rootDir] });
    const resolved = require(electronModulePath);
    if (typeof resolved === 'string' && fs.existsSync(resolved)) {
      electronExe = resolved;
    }
  } catch (e) {}

  if (!electronExe) {
    const candidates = [
      path.join(desktopDir, 'node_modules', 'electron', 'dist', isWindows ? 'electron.exe' : 'electron'),
      path.join(desktopDir, 'node_modules', '.bin', isWindows ? 'electron.cmd' : 'electron'),
      path.join(rootDir, 'node_modules', '.bin', isWindows ? 'electron.cmd' : 'electron'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) {
        electronExe = c;
        break;
      }
    }
  }

  // 4. Start Vite Renderer
  const viteBin = path.join(desktopDir, 'node_modules', '.bin', isWindows ? 'vite.cmd' : 'vite');
  const viteCmd = fs.existsSync(viteBin) ? viteBin : (isWindows ? 'npx.cmd' : 'npx');
  const viteArgs = fs.existsSync(viteBin) ? [] : ['vite'];

  console.log('\x1b[34mℹ\x1b[0m Starting Vite development server...');
  const viteProc = spawn(viteCmd, viteArgs, {
    cwd: desktopDir,
    stdio: 'pipe',
    shell: isWindows,
  });

  let electronLaunched = false;
  function launchElectron() {
    if (electronLaunched) return;
    electronLaunched = true;

    console.log('\x1b[32m🚀\x1b[0m Launching NEURO Desktop App & Desktop Neon Orb (Ctrl+Space)...');
    
    const runCmd = electronExe || (isWindows ? 'npx.cmd' : 'npx');
    const runArgs = electronExe ? ['.'] : ['electron', '.'];

    const electronProc = spawn(runCmd, runArgs, {
      cwd: desktopDir,
      stdio: 'inherit',
      shell: !electronExe && isWindows,
      env: {
        ...process.env,
        NEURO_BACKEND_MANAGED_BY_LAUNCHER: '1',
      },
    });

    electronProc.on('exit', (code) => {
      console.log('\n\x1b[35mNeuro Desktop closed.\x1b[0m');
      if (backendProc) {
        if (isWindows && backendProc.pid) {
          spawn('taskkill', ['/pid', backendProc.pid.toString(), '/f', '/t']);
        } else {
          backendProc.kill('SIGTERM');
        }
      }
      viteProc.kill();
      process.exit(0);
    });
  }

  // Rapid Port Polling: only launch Electron once Vite is genuinely ready on port 3000
  let pollCount = 0;
  const maxPolls = 300; // up to 30s
  const portInterval = setInterval(async () => {
    pollCount++;
    const isViteReady = await checkHttpPort(3000, '/');
    if (isViteReady) {
      clearInterval(portInterval);
      launchElectron();
    } else if (pollCount >= maxPolls) {
      clearInterval(portInterval);
      console.warn('[Neuro] Vite server polling timed out, attempting to launch Electron...');
      launchElectron();
    }
  }, 100);

  viteProc.stdout.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('Local:') || msg.includes('3000') || msg.includes('ready in')) {
      clearInterval(portInterval);
      launchElectron();
    }
  });

  viteProc.stderr.on('data', (data) => {
    const msg = data.toString();
    if (msg.includes('error') || msg.includes('Error')) {
      console.warn('[Neuro] Vite notice:', msg.trim());
    }
  });

  // Clean exit handlers
  process.on('SIGINT', () => {
    if (backendProc) {
      if (isWindows && backendProc.pid) {
        try {
          execSync(`taskkill /f /t /pid ${backendProc.pid}`);
        } catch(e) {}
      } else {
        backendProc.kill('SIGTERM');
      }
    }
    if (viteProc && viteProc.pid) {
        if (isWindows) {
           try { execSync(`taskkill /f /t /pid ${viteProc.pid}`); } catch(e){}
        } else {
           viteProc.kill('SIGTERM');
        }
    } else {
       viteProc.kill();
    }
    process.exit(0);
  });
}

main();
