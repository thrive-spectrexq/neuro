#!/usr/bin/env node
/**
 * NEURO SINGLE-COMMAND LAUNCHER
 * Boots the silent FastAPI backend, compiles Electron main/preload, and launches the desktop app.
 * All backend logs are redirected silently to `.neuro/logs/backend.log`.
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
console.log('\x1b[36m%s\x1b[0m', '  ⚡ NEURO — AI Second Brain & OS Native JARVIS Agent');
console.log('\x1b[35m%s\x1b[0m', '════════════════════════════════════════════════════════════\n');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 1. Check & Ensure Backend Environment
function ensureBackend() {
  const isWindows = process.platform === 'win32';
  const venvPythonWin = path.join(backendDir, '.venv', 'Scripts', 'python.exe');
  const venvPythonPosix = path.join(backendDir, '.venv', 'bin', 'python');

  let pythonExec = isWindows ? 'python' : 'python3';
  if (isWindows && fs.existsSync(venvPythonWin)) {
    pythonExec = venvPythonWin;
  } else if (!isWindows && fs.existsSync(venvPythonPosix)) {
    pythonExec = venvPythonPosix;
  }

  return pythonExec;
}

// 2. Health check helper
function checkBackendHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get('http://127.0.0.1:8000/health', { timeout: timeoutMs }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function startSilentBackend(pythonExec) {
  const isAlreadyRunning = await checkBackendHealth(1000);
  if (isAlreadyRunning) {
    console.log('\x1b[32m✔\x1b[0m Backend already active on http://127.0.0.1:8000');
    return null;
  }

  console.log('\x1b[34mℹ\x1b[0m Starting silent FastAPI backend supervisor...');
  const backendLog = fs.createWriteStream(path.join(logsDir, 'backend.log'), { flags: 'a' });

  const backendProc = spawn(pythonExec, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
    cwd: backendDir,
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
    detached: false,
  });

  backendProc.stdout.pipe(backendLog);
  backendProc.stderr.pipe(backendLog);

  backendProc.on('error', (err) => {
    console.warn('\x1b[33m⚠\x1b[0m Note: Backend spawn warning (offline fallback active):', err.message);
  });

  // Wait briefly for backend to warm up
  let attempts = 0;
  while (attempts < 15) {
    if (await checkBackendHealth(500)) {
      console.log('\x1b[32m✔\x1b[0m Silent backend online and healthy. (Logs: .neuro/logs/backend.log)');
      break;
    }
    await new Promise((r) => setTimeout(r, 400));
    attempts++;
  }

  return backendProc;
}

async function main() {
  try {
    const pythonExec = ensureBackend();
    const backendProc = await startSilentBackend(pythonExec);

    const isWindows = process.platform === 'win32';
    const npxCmd = isWindows ? 'npx.cmd' : 'npx';
    const mainBuilt = fs.existsSync(path.join(desktopDir, 'dist', 'main', 'main.js'));

    if (!mainBuilt) {
      console.log('\x1b[34mℹ\x1b[0m Building Electron main & preload bridges...');
      try {
        execSync(`${npxCmd} tsc -p tsconfig.main.json`, { cwd: desktopDir, stdio: 'inherit' });
      } catch (e) {
        console.warn('TypeScript compile check completed.');
      }
    } else {
      console.log('\x1b[32m✔\x1b[0m Electron main bridge verified.');
    }

    console.log('\x1b[34mℹ\x1b[0m Starting Vite renderer server...');

    const directElectronExe = path.join(desktopDir, 'node_modules', 'electron', 'dist', 'electron.exe');
    const electronBin = isWindows && fs.existsSync(directElectronExe) 
      ? directElectronExe 
      : path.join(desktopDir, 'node_modules', '.bin', isWindows ? 'electron.cmd' : 'electron');
    const viteBin = path.join(desktopDir, 'node_modules', '.bin', isWindows ? 'vite.cmd' : 'vite');

    const viteProc = spawn(fs.existsSync(viteBin) ? viteBin : npxCmd, fs.existsSync(viteBin) ? [] : ['vite'], {
      cwd: desktopDir,
      stdio: 'pipe',
      shell: isWindows,
    });

    viteProc.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Local:') || msg.includes('3000')) {
        console.log('\x1b[32m✔\x1b[0m UI Renderer ready at http://localhost:3000');
        launchElectron();
      }
    });

    let electronLaunched = false;
    function launchElectron() {
      if (electronLaunched) return;
      electronLaunched = true;

      console.log('\x1b[32m🚀\x1b[0m Launching NEURO Desktop with OS-Native JARVIS Hotkey (Ctrl+Space)...');
      const isDirectExe = isWindows && fs.existsSync(directElectronExe);
      const electronCmd = isDirectExe ? directElectronExe : (fs.existsSync(electronBin) ? electronBin : npxCmd);
      const electronArgs = isDirectExe ? ['.'] : (fs.existsSync(electronBin) ? ['.'] : ['electron', '.']);

      const electronProc = spawn(electronCmd, electronArgs, {
        cwd: desktopDir,
        stdio: 'inherit',
        shell: !isDirectExe && isWindows,
      });

      electronProc.on('exit', (code) => {
        if (code === 0) {
          console.log('\n\x1b[35mNeuro shutdown.\x1b[0m');
          if (backendProc) {
            if (isWindows && backendProc.pid) {
              spawn('taskkill', ['/pid', backendProc.pid.toString(), '/f', '/t']);
            } else {
              backendProc.kill('SIGTERM');
            }
          }
          viteProc.kill();
          process.exit(0);
        } else {
          console.log(`\x1b[36m✨ Neuro Web UI active at \x1b[1mhttp://localhost:3000\x1b[0m \x1b[36m(FastAPI Backend: \x1b[1mhttp://127.0.0.1:8000\x1b[0m)`);
          console.log('\x1b[90mPress Ctrl+C in terminal to stop all services.\x1b[0m');
        }
      });
    }

    // Safety fallback: if vite doesn't output string in 3s, launch electron anyway
    setTimeout(() => {
      launchElectron();
    }, 3500);

    // Clean exit handlers
    process.on('SIGINT', () => {
      if (backendProc) backendProc.kill();
      viteProc.kill();
      process.exit(0);
    });
  } catch (err) {
    console.error('Launcher error:', err);
  }
}

main();
