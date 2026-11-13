import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildExtension } from './build';

const temporaryDirectories: string[] = [];
function tempDirectory(): string {
  const dir = mkdtempSync(join(tmpdir(), 'inari-ui-ext-build-'));
  temporaryDirectories.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of temporaryDirectories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('buildExtension', { timeout: 30000 }, () => {
  it('emits a production remoteEntry with the normalized container and shared singletons', async () => {
    const outDir = tempDirectory();
    const result = await buildExtension({
      entry: 'harness/testdata/basic-extension.tsx',
      name: 'inari-ext-test',
      outDir,
      tsconfig: 'tsconfig.json',
    });

    expect(result.containerName).toBe('inari_ext_test');
    expect(result.outDir).toBe(resolve(outDir));
    const remoteEntry = join(outDir, 'remoteEntry.js');
    expect(statSync(remoteEntry).size).toBeGreaterThan(0);
    expect(readFileSync(remoteEntry, 'utf8')).toContain('inari_ext_test');

    const stats = result.stats.toJson({ modules: true });
    const modules = stats.modules ?? [];
    for (const singleton of [
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'zod',
      '@7k-inari/ui-plugin-sdk',
    ]) {
      const consumed = modules.some((module) =>
        module.moduleType === 'consume-shared-module' && module.name?.includes(` ${singleton}@`));
      expect(consumed, `${singleton} is consumed from the host share scope`).toBe(true);
    }
    for (const forbidden of [
      '/node_modules/react/',
      '/node_modules/react-dom/',
      '/node_modules/react-router-dom/',
      '/node_modules/zod/',
      '/node_modules/@7k-inari/ui-plugin-sdk/',
    ]) {
      const bundled = modules.filter((module) => module.name?.includes(forbidden)).map((module) => module.name);
      expect(bundled, `host singleton bundled from ${forbidden}`).toEqual([]);
    }
  });

  it('rejects an empty extension name', async () => {
    await expect(buildExtension({ name: '' })).rejects.toThrow('extension name is required');
  });

  it('rejects a missing entry', async () => {
    await expect(buildExtension({ entry: 'harness/testdata/missing.tsx', name: 'missing', outDir: tempDirectory() })).rejects.toThrow(/entry|not found/i);
  });

  it('fails on TypeScript compiler errors', async () => {
    await expect(buildExtension({
      entry: 'harness/testdata/broken-extension.ts',
      name: 'broken',
      outDir: tempDirectory(),
      tsconfig: 'tsconfig.json',
    })).rejects.toThrow(/not a number|error ts2322|build failed/i);
  });
});
