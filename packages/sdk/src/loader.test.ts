import test from 'node:test';
import assert from 'node:assert';
import { PluginLoader, PluginContext, definePlugin } from './index';

test('PluginLoader Registration & Activation Lifecycle', async () => {
  const dummyContext: PluginContext = {
    registerImporter: () => {},
    registerView: () => {},
    addCommand: () => {},
    onSave: () => {},
  };

  const loader = new PluginLoader(dummyContext);

  let activated = false;
  let deactivated = false;

  const testPlugin = definePlugin({
    id: 'test-plugin-1',
    name: 'Test Plugin',
    version: '1.0.0',
    activate: async (ctx) => {
      activated = true;
    },
    deactivate: async () => {
      deactivated = true;
    },
  });

  loader.registerPlugin(testPlugin);
  assert.strictEqual(loader.getPlugins().length, 1);
  assert.strictEqual(loader.getPlugins()[0].status, 'inactive');

  const success = await loader.activatePlugin('test-plugin-1');
  assert.strictEqual(success, true);
  assert.strictEqual(activated, true);
  assert.strictEqual(loader.getPlugins()[0].status, 'active');

  const deactSuccess = await loader.deactivatePlugin('test-plugin-1');
  assert.strictEqual(deactSuccess, true);
  assert.strictEqual(deactivated, true);
  assert.strictEqual(loader.getPlugins()[0].status, 'inactive');
});

test('PluginLoader Error Isolation', async () => {
  const dummyContext: PluginContext = {
    registerImporter: () => {},
    registerView: () => {},
    addCommand: () => {},
    onSave: () => {},
  };

  const loader = new PluginLoader(dummyContext);

  const faultyPlugin = definePlugin({
    id: 'faulty-plugin',
    name: 'Faulty Plugin',
    version: '1.0.0',
    activate: () => {
      throw new Error('Plugin initialization failed');
    },
  });

  loader.registerPlugin(faultyPlugin);
  const success = await loader.activatePlugin('faulty-plugin');
  assert.strictEqual(success, false);
  assert.strictEqual(loader.getPlugins()[0].status, 'error');
  assert.strictEqual(loader.getPlugins()[0].error, 'Plugin initialization failed');
});
