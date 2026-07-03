import { PluginHooks, PluginManifest } from './types';

export interface PluginContext {
  pluginId: string;
  api: {
    getNote: (id: string) => Promise<any>;
    updateNote: (id: string, data: any) => Promise<any>;
    createNote: (data: any) => Promise<any>;
    deleteNote: (id: string) => Promise<void>;
    search: (query: string) => Promise<any[]>;
  };
  ui: {
    notify: (message: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
    showModal: (title: string, content: any) => void;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
  };
}

export interface PluginDefinition {
  manifest: PluginManifest;
  hooks: PluginHooks;
}

export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition;
}
