export interface Command {
  id: string;
  title: string;
  execute: () => void | Promise<void>;
}

export interface Importer {
  id: string;
  name: string;
  extensions: string[];
  import: (file: any) => Promise<any>;
}

export interface View {
  id: string;
  title: string;
  component: any;
}

export interface PluginContext {
  registerImporter: (importer: Importer) => void;
  registerView: (view: View) => void;
  addCommand: (command: Command) => void;
  onSave: (callback: () => void | Promise<void>) => void;
}

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  activate: (context: PluginContext) => void | Promise<void>;
  deactivate?: () => void | Promise<void>;
}

/**
 * Defines a Neuro plugin with strict types.
 * @param config The plugin configuration.
 * @returns The typed plugin configuration.
 */
export function definePlugin(config: PluginConfig): PluginConfig {
  return config;
}

export * from './loader';
