import { PluginConfig, PluginContext } from './index';

export interface LoadedPlugin {
  config: PluginConfig;
  status: 'active' | 'inactive' | 'error';
  error?: string;
}

export class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  public registerPlugin(config: PluginConfig): void {
    if (!config.id || !config.name || !config.version) {
      throw new Error('Plugin config requires id, name, and version');
    }

    if (this.plugins.has(config.id)) {
      console.warn(`Plugin ${config.id} is already registered. Overwriting.`);
    }

    this.plugins.set(config.id, {
      config,
      status: 'inactive',
    });
  }

  public async activatePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin) {
      throw new Error(`Plugin with id "${id}" not found.`);
    }

    try {
      await plugin.config.activate(this.context);
      plugin.status = 'active';
      plugin.error = undefined;
      return true;
    } catch (err: any) {
      plugin.status = 'error';
      plugin.error = err?.message || String(err);
      console.error(`Failed to activate plugin ${id}:`, err);
      return false;
    }
  }

  public async deactivatePlugin(id: string): Promise<boolean> {
    const plugin = this.plugins.get(id);
    if (!plugin || plugin.status !== 'active') {
      return false;
    }

    try {
      if (plugin.config.deactivate) {
        await plugin.config.deactivate();
      }
      plugin.status = 'inactive';
      return true;
    } catch (err: any) {
      console.error(`Failed to deactivate plugin ${id}:`, err);
      plugin.status = 'error';
      plugin.error = err?.message || String(err);
      return false;
    }
  }

  public getPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getActivePlugins(): LoadedPlugin[] {
    return this.getPlugins().filter((p) => p.status === 'active');
  }
}
