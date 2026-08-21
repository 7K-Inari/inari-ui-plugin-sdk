import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@7k-inari/ui-plugin-sdk': fileURLToPath(new URL('./src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['src/host/**', 'jsdom'], ['src/testing/**', 'jsdom']],
    include: ['src/**/*.test.{ts,tsx}', 'harness/**/*.test.ts', 'examples/**/*.test.ts'],
  },
});
