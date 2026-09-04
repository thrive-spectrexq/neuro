# Plugin Development

Neuro supports a flexible plugin system to extend functionality using the modern `@neuro/sdk`.

## Creating a Plugin

You should define your plugin using the `definePlugin` approach. This provides a type-safe `PluginContext` for interacting with the application.

```typescript
import { definePlugin, PluginContext } from '@neuro/sdk';

export default definePlugin({
  id: 'my-awesome-plugin',
  name: 'My Awesome Plugin',
  version: '1.0.0',
  description: 'An example plugin utilizing the Neuro SDK',
  
  activate(ctx: PluginContext) {
    console.log('Plugin activated!');

    // Register a custom importer
    ctx.registerImporter({
      id: 'csv-importer',
      name: 'CSV Importer',
      extensions: ['.csv'],
      import: async (file) => {
        // Handle file import
        return { content: 'imported content' };
      }
    });

    // Register a custom view
    ctx.registerView({
      id: 'my-custom-view',
      name: 'My View',
      component: () => <div>Hello from my custom view!</div>
    });

    // Add a command to the command palette
    ctx.addCommand({
      id: 'say-hello',
      name: 'Say Hello',
      action: () => {
        console.log('Hello from the command palette!');
      }
    });
  },
  
  deactivate(ctx: PluginContext) {
    console.log('Plugin deactivated!');
  }
});
```
