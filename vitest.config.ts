import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [['src/host/**', 'jsdom'], ['src/testing/**', 'jsdom']],
    include: ['src/**/*.test.{ts,tsx}', 'harness/**/*.test.ts', 'examples/**/*.test.ts'],
  },
});
