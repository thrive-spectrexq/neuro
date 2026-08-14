import { ChildProcess, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';

export class BackendProcessManager {
  private childProcess: ChildProcess | null = null;
  private backendUrl = 'http://127.0.0.1:8000';
  private logFile: fs.WriteStream | null = null;

  private findProjectRoot(): string {
    // Navigate upwards to find the monorepo root containing 'backend' folder
    let currentDir = __dirname;
    for (let i = 0; i < 5; i++) {
      if (fs.existsSync(path.join(currentDir, 'backend', 'app'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return path.resolve(__dirname, '../../../..');
  }

  private findPythonExecutable(projectRoot: string): { command: string; args: string[] } {
    const isWindows = process.platform === 'win32';
    const venvPythonWin = path.join(projectRoot, 'backend', '.venv', 'Scripts', 'python.exe');
    const venvPythonPosix = path.join(projectRoot, 'backend', '.venv', 'bin', 'python');

    if (isWindows && fs.existsSync(venvPythonWin)) {
      return {
        command: venvPythonWin,
        args: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      };
    }

    if (!isWindows && fs.existsSync(venvPythonPosix)) {
      return {
        command: venvPythonPosix,
        args: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
      };
    }

    // Fallback to system python/uvicorn
    return {
      command: isWindows ? 'python' : 'python3',
      args: ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
    };
  }

  public async isBackendHealthy(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`${this.backendUrl}/health`, { timeout: 1500 }, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  public async start(): Promise<void> {
    // If backend is already launched by root launcher script, avoid duplicate spawning
    if (process.env.NEURO_BACKEND_MANAGED_BY_LAUNCHER === '1') {
      console.log('[Neuro] Backend is managed by root launcher, waiting for health check...');
      await this.waitForHealthy(25000);
      return;
    }

    // Check if backend is already running
    const alreadyRunning = await this.isBackendHealthy();
    if (alreadyRunning) {
      console.log('[Neuro] Backend is already running and healthy at', this.backendUrl);
      return;
    }

    const projectRoot = this.findProjectRoot();
    const backendDir = path.join(projectRoot, 'backend');
    const logsDir = path.join(projectRoot, '.neuro', 'logs');

    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
    } catch (e) {
      console.warn('[Neuro] Could not create log directory:', e);
    }

    const logFilePath = path.join(logsDir, 'backend.log');
    this.logFile = fs.createWriteStream(logFilePath, { flags: 'a' });

    const { command, args } = this.findPythonExecutable(projectRoot);

    console.log('[Neuro] Silently launching backend process:', command, args.join(' '));

    try {
      this.childProcess = spawn(command, args, {
        cwd: backendDir,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: true,
        detached: false,
      });

      if (this.childProcess.stdout && this.logFile) {
        this.childProcess.stdout.pipe(this.logFile);
      }

      if (this.childProcess.stderr && this.logFile) {
        this.childProcess.stderr.pipe(this.logFile);
      }

      this.childProcess.on('error', (err) => {
        console.error('[Neuro] Failed to start backend child process:', err);
      });

      this.childProcess.on('exit', (code, signal) => {
        console.log(`[Neuro] Backend process exited with code ${code}, signal ${signal}`);
        this.childProcess = null;
      });

      // Poll until backend is responsive (allow up to 25s for embedding model loading)
      await this.waitForHealthy(25000);
    } catch (error) {
      console.error('[Neuro] Backend process spawn error:', error);
    }
  }

  private async waitForHealthy(maxWaitMs: number): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.isBackendHealthy()) {
        console.log('[Neuro] Backend process is ready and responding.');
        return true;
      }
      await new Promise((r) => setTimeout(r, 400));
    }
    console.warn('[Neuro] Backend did not respond within timeout, continuing with offline UI fallback.');
    return false;
  }

  public stop(): void {
    if (this.childProcess) {
      console.log('[Neuro] Stopping backend child process...');
      try {
        if (process.platform === 'win32' && this.childProcess.pid) {
          spawn('taskkill', ['/pid', this.childProcess.pid.toString(), '/f', '/t']);
        } else {
          this.childProcess.kill('SIGTERM');
        }
      } catch (e) {
        console.error('[Neuro] Error killing backend process:', e);
      }
      this.childProcess = null;
    }
    if (this.logFile) {
      this.logFile.end();
      this.logFile = null;
    }
  }
}

export const backendProcessManager = new BackendProcessManager();
