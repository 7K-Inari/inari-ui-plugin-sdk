import js from '@eslint/js';
import tseslint from 'typescript-eslint';

const nodeGlobals = {
  process: 'readonly',
  console: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  Response: 'readonly',
  RequestInit: 'readonly',
};

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'templates', 'harness/shell/dist'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['bin/**/*.mjs', '*.config.{ts,js}', 'harness/**/*.ts'],
    languageOptions: { globals: nodeGlobals },
  },
);
