# Dev harness

Run a UI extension standalone against a mocked control plane.

## CLI

```sh
npx inari-ui-ext dev ./src/index.tsx   # or, inside an extension repo: npm run dev
```

Starts:

1. **Mock control plane** (default port 9099) — stub REST endpoints (`/api/v1/clusters`, `/api/v1/catalog/items`, `/api/v1/resources`, `/api/v1/approvals`, `/api/v1/tenants`) backed by fixtures.
2. **Shell preview** (default port 5173) — a minimal host shell (sidebar, tenant switcher, catalog/clusters/resources pages) that mounts the extension's slots: nav items in the sidebar, pages as routes, cluster tabs on the cluster detail page, catalog cards on catalog items, instance actions on resources.

In dev, the extension entry is loaded directly by the shell via Vite (no Module Federation handshake). In production the host loads `remoteEntry.js` served via the backend/OCI registry (spec §5.8); the blueprint/manifest contract is identical either way.

## Programmatic

```ts
import { startDevHarness } from '@inari/ui-plugin-sdk/harness';

const harness = await startDevHarness({
  extensionEntry: './src/index.tsx',
  port: 5173,
  apiPort: 9099,
  fixtures: { clusters: [/* overrides */] },
});
```

## Scaffolding a new extension

```sh
npm create inari-ui-extension my-extension
# equivalent: npx inari-ui-ext init my-extension
```

Copies `templates/extension/` (package.json, tsconfig, example `src/index.tsx`), then `npm install && npm run dev`.
