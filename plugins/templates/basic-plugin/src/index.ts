import { definePlugin, PluginContext } from '@neuro/sdk';

export default definePlugin({
  id: 'basic-plugin',
  name: 'Basic Plugin',
  version: '1.0.0',
  activate: (context: PluginContext) => {
    console.log('Basic plugin activated!');
    
    context.addCommand({
      id: 'basic-plugin.helloWorld',
      title: 'Hello World from Basic Plugin',
      execute: () => {
        console.log('Hello World!');
      }
    });
  },
  deactivate: () => {
    console.log('Basic plugin deactivated!');
  }
});
