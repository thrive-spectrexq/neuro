import type { PluginContext } from './plugin';

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  permissions?: string[];
}

export interface PluginHooks {
  onInit?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: () => Promise<void> | void;
  onNoteCreate?: (note: any) => Promise<any> | any;
  onNoteUpdate?: (note: any) => Promise<any> | any;
  onNoteDelete?: (noteId: string) => Promise<void> | void;
  onUserLogin?: (user: any) => Promise<void> | void;
}
