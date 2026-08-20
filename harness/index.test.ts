import { describe, expect, it } from 'vitest';
import { fileURLToPath } from 'node:url';
import { startDevHarness } from './index';

const exampleEntry = fileURLToPath(new URL('../examples/example-extension.ts', import.meta.url));

describe('startDevHarness', () => {
  it('serves the shell with injected config and the extension module', async () => {
    const harness = await startDevHarness({ extensionEntry: exampleEntry, port: 0, apiPort: 0 });
    try {
      expect(harness.url).toMatch(/^http:\/\/localhost:\d+$/);
      expect(harness.url).not.toContain(':0');

      const html = await fetch(`${harness.url}/`).then((r) => r.text());
      expect(html).toContain('window.__INARI_API_URL__');
      expect(html).toContain(harness.apiUrl);
      expect(html).toContain('window.__INARI_EXTENSION_ENTRY__');

      const main = await fetch(`${harness.url}/main.tsx`).then((r) => r.text());
      expect(main).not.toContain('const apiUrl = __INARI');

      const tenants = await fetch(`${harness.apiUrl}/api/v1/tenants`).then((r) => r.json());
      expect(Array.isArray(tenants)).toBe(true);

      const ext = await fetch(`${harness.url}/@fs${exampleEntry}`);
      expect(ext.status).toBe(200);
    } finally {
      await harness.close();
    }
  }, 30000);
});
