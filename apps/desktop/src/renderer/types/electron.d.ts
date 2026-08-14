export interface ElectronAPI {
  ping: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  launchApp: (appName: string, args?: string) => Promise<{ success: boolean; message: string }>;
  showNotification: (title: string, body: string) => Promise<boolean>;
  writeClipboard: (text: string) => Promise<boolean>;
  readClipboard: () => Promise<string>;
  getBackendStatus: () => Promise<{ healthy: boolean; url: string }>;
  createOrbWindow: () => Promise<boolean>;
  closeOrbWindow: () => Promise<boolean>;
  resizeOrbWindow: (width: number, height: number) => Promise<boolean>;
  focusMainWindow: () => Promise<boolean>;
  toggleMainWindow: () => Promise<boolean>;
  getSystemTelemetry: () => Promise<{
    platform: string;
    arch: string;
    totalMemoryGb: number;
    freeMemoryGb: number;
    memoryUsagePercent: number;
    uptimeHours: number;
    cpus: number;
  }>;
  controlMedia: (action: 'playpause' | 'next' | 'prev' | 'volumeup' | 'volumedown' | 'mute') => Promise<boolean>;
  onToggleJarvisHUD: (callback: () => void) => () => void;
  onQuickNote: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}
