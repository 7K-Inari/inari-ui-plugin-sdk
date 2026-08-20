#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const [command, ...args] = process.argv.slice(2);

async function dev() {
  const entry = args[0] ?? './src/index.ts';
  const { startDevHarness } = await import(resolve(here, '../dist/harness/index.js'));
  const harness = await startDevHarness({ extensionEntry: resolve(process.cwd(), entry) });
  console.log(`Dev harness running at ${harness.url} (mock control plane: ${harness.apiUrl})`);
}

function init() {
  const target = resolve(process.cwd(), args[0] ?? 'my-inari-extension');
  if (existsSync(target)) {
    console.error(`target directory already exists: ${target}`);
    process.exit(1);
  }
  mkdirSync(target, { recursive: true });
  cpSync(resolve(here, '../templates/extension'), target, { recursive: true });
  console.log(`Scaffolded extension in ${target}`);
  console.log('Next: cd into it, npm install, then: npx inari-ui-ext dev');
}

switch (command) {
  case 'dev':
    await dev();
    break;
  case 'init':
    init();
    break;
  default:
    console.log('Usage: inari-ui-ext <dev [entry] | init [dir]>');
    process.exit(command ? 1 : 0);
}
