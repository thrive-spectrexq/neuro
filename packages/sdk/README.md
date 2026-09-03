# @neuro/sdk

Plugin development SDK for Neuro. Enables extending the application with custom importers, custom views, command palette actions, and hooks.

## Plugin Definition

Plugins declare a manifest and lifecycle hooks:

```typescript
import { definePlugin, type PluginContext } from '@neuro/sdk';

export default definePlugin({
  id: 'my-custom-plugin',
  name: 'Custom Importer Plugin',
  version: '1.0.0',
  activate: (context: PluginContext) => {
    context.addCommand({
      id: 'greet',
      title: 'Say Hello',
      execute: () => console.log('Hello from Neuro plugin!'),
    });

    context.registerImporter({
      id: 'custom-format',
      name: 'Custom JSON Notes',
      extensions: ['.cjson'],
      import: async (file) => {
        // parse and return notes
      },
    });
  },
});
```

## Scoped Permissions

Plugins request explicit capability permissions in their manifest:
- `notes:read` / `notes:write`
- `search:query`
- `ai:invoke`
- `memory:read` / `memory:write`
- `filesystem:read` / `filesystem:write`
- `network:outbound`
- `clipboard:read` / `clipboard:write`

## Building & Testing

```bash
pnpm --filter @neuro/sdk typecheck
pnpm --filter @neuro/sdk test
pnpm --filter @neuro/sdk build
```
