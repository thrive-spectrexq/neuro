import { clipboard, Notification, shell } from 'electron';
import { exec, spawn } from 'child_process';
import * as os from 'os';

export interface ExecuteAgentOptions {
  command: string;
}

export function registerOSTools(): void {
  // IPC handles will be attached in main.ts
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
      let command = `start "" "${normalized}"`;
      if (normalized === 'brave' || normalized.includes('brave')) {
        command = 'start brave';
      } else if (normalized === 'chrome' || normalized.includes('chrome')) {
        command = 'start chrome';
      } else if (normalized === 'firefox' || normalized.includes('firefox')) {
        command = 'start firefox';
      } else if (normalized === 'vscode' || normalized === 'code') {
        command = 'code .';
      } else if (normalized === 'cursor') {
        command = 'cursor .';
      } else if (normalized === 'terminal' || normalized === 'powershell') {
        command = 'start wt || start powershell';
      } else if (normalized === 'notepad') {
        command = 'start notepad';
      } else if (normalized === 'explorer' || normalized === 'files') {
        command = 'start explorer';
      } else if (normalized === 'calculator' || normalized === 'calc') {
        command = 'start calc';
      } else if (normalized === 'taskmgr' || normalized.includes('task manager')) {
        command = 'start taskmgr';
      } else if (normalized === 'snipping' || normalized.includes('screenshot')) {
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
