import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer, type ViteDevServer } from 'vite';
import { startMockControlPlane, type MockFixtures } from './server.js';

function resolveShellRoot(): string {
  const srcLayout = fileURLToPath(new URL('./shell', import.meta.url));
  if (existsSync(srcLayout)) return srcLayout;
  return fileURLToPath(new URL('../../harness/shell', import.meta.url));
}

function resolveSdkEntry(): string {
  const srcLayout = fileURLToPath(new URL('../src/index.ts', import.meta.url));
  if (existsSync(srcLayout)) return srcLayout;
  return fileURLToPath(new URL('../index.js', import.meta.url));
}

export interface DevHarnessOptions {
  extensionEntry: string;
  port?: number;
  apiPort?: number;
  fixtures?: MockFixtures;
}

export interface DevHarness {
  url: string;
  apiUrl: string;
  vite: ViteDevServer;
  close: () => Promise<void>;
}

export async function startDevHarness(options: DevHarnessOptions): Promise<DevHarness> {
  const port = options.port ?? 5173;
  const apiPort = options.apiPort ?? 9099;
  const api = await startMockControlPlane(apiPort, options.fixtures);
  const shellRoot = resolveShellRoot();
  const sdkEntry = resolveSdkEntry();
  const vite = await createViteServer({
    root: shellRoot,
    server: { port },
    resolve: {
      alias: [{ find: '@inari/ui-plugin-sdk', replacement: sdkEntry }],
      dedupe: ['react', 'react-dom', 'react-router-dom', 'zod'],
    },
    define: {
      __INARI_API_URL__: JSON.stringify(api.url),
      __INARI_EXTENSION_ENTRY__: JSON.stringify(options.extensionEntry),
    },
    optimizeDeps: { noDiscovery: true },
    logLevel: 'warn',
  });
  await vite.listen();
  return {
    url: `http://localhost:${port}`,
    apiUrl: api.url,
    vite,
    close: async () => {
      await vite.close();
      await api.close();
    },
  };
}

export { createMockControlPlane, startMockControlPlane } from './server.js';
export type { MockFixtures } from './server.js';
