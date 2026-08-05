export interface ElectronAPI {
  ping: () => Promise<string>;
  openExternal: (url: string) => Promise<boolean>;
  launchApp: (appName: string, args?: string) => Promise<{ success: boolean; message: string }>;
  showNotification: (title: string, body: string) => Promise<boolean>;
  writeClipboard: (text: string) => Promise<boolean>;
  readClipboard: () => Promise<string>;
  getBackendStatus: () => Promise<{ healthy: boolean; url: string }>;
  onToggleJarvisHUD: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}
