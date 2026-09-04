import type { PluginContext } from './index';

export type PluginPermission =
  | 'notes:read'
  | 'notes:write'
  | 'search:query'
  | 'ai:invoke'
  | 'memory:read'
  | 'memory:write'
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:outbound'
  | 'clipboard:read'
  | 'clipboard:write';

export type PluginCapability =
  | 'note-action'
  | 'command-palette'
  | 'sidebar-view'
  | 'status-bar-item'
  | 'ai-tool'
  | 'background-sync';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: PluginPermission[];
  capabilities?: PluginCapability[];
  homepage?: string;
  repository?: string;
  icon?: string;
}

export interface PluginHooks {
  onInit?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: () => Promise<void> | void;
  onNoteCreate?: (note: any) => Promise<any> | any;
  onNoteUpdate?: (note: any) => Promise<any> | any;
  onNoteDelete?: (noteId: string) => Promise<void> | void;
  onUserLogin?: (user: any) => Promise<void> | void;
}
