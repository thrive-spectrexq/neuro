import { clipboard, Notification, shell } from 'electron';
import { exec, spawn } from 'child_process';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

export interface ExecuteAgentOptions {
  command: string;
}

export interface SystemTelemetry {
  platform: string;
  arch: string;
  totalMemoryGb: number;
  freeMemoryGb: number;
  memoryUsagePercent: number;
  uptimeHours: number;
  cpus: number;
}

export async function openExternalUrl(url: string): Promise<boolean> {
  try {
    await shell.openExternal(url);
    return true;
  } catch (e) {
    console.error('Failed to open external url:', url, e);
    return false;
  }
}

function tryDirectLaunch(candidatePaths: string[], args: string[] = []): boolean {
  for (const p of candidatePaths) {
    if (!p) continue;
    try {
      if (fs.existsSync(p)) {
        const child = spawn(p, args, { detached: true, stdio: 'ignore' });
        child.unref();
        return true;
      }
    } catch {}
  }
  return false;
}

export async function launchNativeApp(appName: string, args?: string): Promise<{ success: boolean; message: string }> {
  const platform = os.platform();
  const normalized = appName.toLowerCase().trim();

  try {
    if (normalized.includes('spotify') && args) {
      const uri = `spotify:search:${encodeURIComponent(args)}`;
      await shell.openExternal(uri);
      return { success: true, message: `Opened Spotify search for ${args}` };
    }

    if (platform === 'win32') {
      const projectDir = process.cwd();
      const localApp = process.env.LOCALAPPDATA || '';
      const progFiles = process.env.ProgramFiles || 'C:\\Program Files';
      const progFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
      const appData = process.env.APPDATA || '';

      // Direct executable path maps for instantaneous 100% reliable launching
      if (normalized === 'brave' || normalized.includes('brave')) {
        const bravePaths = [
          path.join(progFiles, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
          path.join(progFilesX86, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
          path.join(localApp, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
        ];
        if (tryDirectLaunch(bravePaths, args ? [args] : [])) {
          return { success: true, message: 'Launched Brave Browser' };
        }
      } else if (normalized === 'chrome' || normalized.includes('chrome')) {
        const chromePaths = [
          path.join(progFiles, 'Google/Chrome/Application/chrome.exe'),
          path.join(progFilesX86, 'Google/Chrome/Application/chrome.exe'),
          path.join(localApp, 'Google/Chrome/Application/chrome.exe'),
        ];
        if (tryDirectLaunch(chromePaths, args ? [args] : [])) {
          return { success: true, message: 'Launched Google Chrome' };
        }
      } else if (normalized.includes('edge') || normalized.includes('msedge')) {
        const edgePaths = [
          path.join(progFilesX86, 'Microsoft/Edge/Application/msedge.exe'),
          path.join(progFiles, 'Microsoft/Edge/Application/msedge.exe'),
        ];
        if (tryDirectLaunch(edgePaths, args ? [args] : [])) {
          return { success: true, message: 'Launched Microsoft Edge' };
        }
      } else if (normalized === 'vscode' || normalized === 'code' || normalized.includes('vs code')) {
        const codePaths = [
          path.join(localApp, 'Programs/Microsoft VS Code/Code.exe'),
          path.join(progFiles, 'Microsoft VS Code/Code.exe'),
        ];
        if (tryDirectLaunch(codePaths, [projectDir])) {
          return { success: true, message: 'Launched VS Code' };
        }
      } else if (normalized === 'cursor' || normalized.includes('cursor')) {
        const cursorPaths = [
          path.join(localApp, 'Programs/cursor/Cursor.exe'),
          path.join(localApp, 'Programs/Cursor/Cursor.exe'),
        ];
        if (tryDirectLaunch(cursorPaths, [projectDir])) {
          return { success: true, message: 'Launched Cursor IDE' };
        }
      } else if (normalized === 'obsidian') {
        const obsidianPaths = [
          path.join(localApp, 'Obsidian/Obsidian.exe'),
          path.join(localApp, 'Programs/Obsidian/Obsidian.exe'),
        ];
        if (tryDirectLaunch(obsidianPaths)) {
          return { success: true, message: 'Launched Obsidian Vault' };
        }
      } else if (normalized === 'notion') {
        const notionPaths = [
          path.join(localApp, 'Programs/Notion/Notion.exe'),
        ];
        if (tryDirectLaunch(notionPaths)) {
          return { success: true, message: 'Launched Notion' };
        }
      } else if (normalized === 'spotify') {
        const spotifyPaths = [
          path.join(appData, 'Spotify/Spotify.exe'),
          path.join(localApp, 'Microsoft/WindowsApps/Spotify.exe'),
        ];
        if (tryDirectLaunch(spotifyPaths)) {
          return { success: true, message: 'Launched Spotify' };
        }
      }

      // Shell-escape input for safe fallback execution
      const sanitizedAppName = normalized.replace(/[&|;$\`><]/g, '');
      let command = `start "" "${sanitizedAppName}"`;

      if (normalized.includes('antigravity')) {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; if (Get-Command antigravity -ErrorAction SilentlyContinue) { antigravity } else { Write-Host '⚡ Launching Antigravity Assistant in ${projectDir}...' -ForegroundColor emerald; code . }"`;
      } else if (normalized.includes('claude') || normalized.includes('claude code')) {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; if (Get-Command claude -ErrorAction SilentlyContinue) { claude } else { Write-Host '⚡ Launching Claude Code in ${projectDir}...' -ForegroundColor Magenta; npx @anthropic-ai/claude-code }"`;
      } else if (normalized.includes('codex') || normalized.includes('openai codex')) {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; if (Get-Command codex -ErrorAction SilentlyContinue) { codex } else { Write-Host '⚡ Launching Codex CLI in ${projectDir}...' -ForegroundColor Green; code . }"`;
      } else if (normalized.includes('aider')) {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; if (Get-Command aider -ErrorAction SilentlyContinue) { aider } else { Write-Host '⚡ Launching Aider AI in ${projectDir}...' -ForegroundColor Yellow; code . }"`;
      } else if (normalized.includes('coding') || normalized.includes('code_session') || normalized.includes('resume coding')) {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; Write-Host '🚀 Resuming AI Coding Session in ${projectDir}...' -ForegroundColor emerald; if (Get-Command antigravity -ErrorAction SilentlyContinue) { antigravity } else { code . }"`;
      } else if (normalized === 'cursor' || normalized.includes('cursor')) {
        command = `start cursor "${projectDir}" || cursor .`;
      } else if (normalized === 'windsurf' || normalized.includes('windsurf')) {
        command = `start windsurf "${projectDir}" || windsurf .`;
      } else if (normalized === 'zed' || normalized.includes('zed')) {
        command = `start zed "${projectDir}" || zed .`;
      } else if (normalized === 'nvim' || normalized === 'neovim') {
        command = `start powershell -NoExit -Command "cd '${projectDir}'; nvim"`;
      } else if (normalized === 'vscode' || normalized === 'code' || normalized.includes('vs code')) {
        command = `start code "${projectDir}" || code .`;
      } else if (normalized === 'github' || normalized.includes('github desktop')) {
        command = 'start github-desktop || start https://github.com';
      } else if (normalized === 'docker' || normalized.includes('docker desktop')) {
        command = 'start "" "C:\\Program Files\\Docker\\Docker\\Docker Desktop.exe" || start docker';
      } else if (normalized === 'postman') {
        command = 'start postman || start https://web.postman.co';
      } else if (normalized.includes('browser') || normalized === 'web' || normalized === 'internet') {
        command = 'start https://www.google.com';
      } else if (normalized.includes('edge') || normalized.includes('msedge')) {
        command = 'start msedge || start microsoft-edge:';
      } else if (normalized === 'brave' || normalized.includes('brave')) {
        command = 'start brave || start https://google.com';
      } else if (normalized === 'chrome' || normalized.includes('chrome')) {
        command = 'start chrome || start https://google.com';
      } else if (normalized === 'firefox' || normalized.includes('firefox')) {
        command = 'start firefox || start https://google.com';
      } else if (normalized === 'spotify') {
        command = 'start spotify: || start spotify';
      } else if (normalized === 'terminal' || normalized === 'powershell' || normalized === 'wt' || normalized === 'cmd') {
        command = `start wt -d "${projectDir}" || start powershell -NoExit -Command "cd '${projectDir}'"`;
      } else if (normalized === 'notion') {
        command = 'start notion || start https://notion.so';
      } else if (normalized === 'obsidian') {
        command = 'start obsidian || start obsidian://';
      } else if (normalized === 'figma') {
        command = 'start figma || start https://figma.com';
      } else if (normalized === 'notepad') {
        command = 'start notepad';
      } else if (normalized === 'explorer' || normalized === 'files' || normalized === 'folder' || normalized.includes('open folder')) {
        command = `start explorer "${projectDir}"`;
      } else if (normalized === 'calculator' || normalized === 'calc') {
        command = 'start calc';
      } else if (normalized === 'taskmgr' || normalized.includes('task manager')) {
        command = 'start taskmgr';
      } else if (normalized === 'snipping' || normalized.includes('screenshot') || normalized.includes('snip')) {
        command = 'start snippingtool';
      } else if (normalized === 'discord') {
        command = 'start discord';
      } else if (normalized === 'slack') {
        command = 'start slack';
      }

      exec(command, (err) => {
        if (err) console.warn('Exec error (may still succeed):', err);
      });
      return { success: true, message: `Launched ${appName}` };
    } else if (platform === 'darwin') {
      const target = normalized === 'vscode' ? 'Visual Studio Code' : appName;
      exec(`open -a "${target}"`, (err) => {
        if (err) console.warn('Darwin launch warning:', err);
      });
      return { success: true, message: `Launched ${appName}` };
    } else {
      exec(`${normalized} &`, (err) => {
        if (err) console.warn('Linux launch warning:', err);
      });
      return { success: true, message: `Launched ${appName}` };
    }
  } catch (error: any) {
    return { success: false, message: error?.message || 'Failed to launch application' };
  }
}

export function showDesktopNotification(title: string, body: string): void {
  try {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        silent: false,
      });
      notification.show();
    }
  } catch (e) {
    console.warn('Desktop notification error:', e);
  }
}

export function copyClipboard(text: string): void {
  clipboard.writeText(text);
}

export function readClipboard(): string {
  return clipboard.readText();
}

export function getSystemTelemetry(): SystemTelemetry {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsagePercent = Math.round((usedMem / totalMem) * 100);

  return {
    platform: os.platform(),
    arch: os.arch(),
    totalMemoryGb: Number((totalMem / (1024 * 1024 * 1024)).toFixed(1)),
    freeMemoryGb: Number((freeMem / (1024 * 1024 * 1024)).toFixed(1)),
    memoryUsagePercent: memUsagePercent,
    uptimeHours: Number((os.uptime() / 3600).toFixed(1)),
    cpus: os.cpus().length,
  };
}

export async function controlMedia(action: 'playpause' | 'next' | 'prev' | 'volumeup' | 'volumedown' | 'mute'): Promise<boolean> {
  const isWindows = process.platform === 'win32';
  if (!isWindows) return false;

  const keyMap: Record<string, number> = {
    playpause: 0xb3,
    next: 0xb0,
    prev: 0xb1,
    volumeup: 0xaf,
    volumedown: 0xae,
    mute: 0xad,
  };

  const vk = keyMap[action];
  if (!vk) return false;

  const script = `
    $wsh = New-Object -ComObject Wscript.Shell;
    $wsh.SendKeys([char]${vk});
  `;

  return new Promise((resolve) => {
    exec(`powershell -Command "${script.replace(/\r?\n/g, ' ')}"`, (err) => {
      resolve(!err);
    });
  });
}
