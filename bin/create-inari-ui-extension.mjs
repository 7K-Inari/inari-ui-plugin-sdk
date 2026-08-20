#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const result = spawnSync(process.execPath, [resolve(here, 'inari-ui-ext.mjs'), 'init', ...process.argv.slice(2)], {
  stdio: 'inherit',
});
process.exit(result.status ?? 0);
