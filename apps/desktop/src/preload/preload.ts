import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  openExternal: (url: string) => ipcRenderer.invoke('shell:openExternal', url),
  launchApp: (appName: string, args?: string) => ipcRenderer.invoke('shell:launchApp', { appName, args }),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('notification:show', { title, body }),
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  onToggleJarvisHUD: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('jarvis:toggle-hud', handler);
    return () => {
      ipcRenderer.removeListener('jarvis:toggle-hud', handler);
    };
  },
});
