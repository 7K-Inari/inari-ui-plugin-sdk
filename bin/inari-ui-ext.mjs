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

async function build() {
  let entry;
  let name;
  let outDir;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--name') {
      name = args[++i];
    } else if (arg === '--out-dir') {
      outDir = args[++i];
    } else if (arg.startsWith('--')) {
      console.error(`unknown build option: ${arg}`);
      process.exit(1);
    } else if (entry === undefined) {
      entry = arg;
    } else {
      console.error(`unexpected build argument: ${arg}`);
      process.exit(1);
    }
  }
  if (!name) {
    console.error('inari-ui-ext build requires --name <registry-extension-name>');
    process.exit(1);
  }
  try {
    const { buildExtension } = await import(resolve(here, '../dist/harness/build.js'));
    const result = await buildExtension({ entry, name, outDir });
    console.log(`Built ${result.containerName}/extension → ${resolve(result.outDir, 'remoteEntry.js')}`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

switch (command) {
  case 'dev':
    await dev();
    break;
  case 'init':
    init();
    break;
  case 'build':
    await build();
    break;
  default:
    console.log('Usage: inari-ui-ext <dev [entry] | init [dir] | build [entry] --name <name> [--out-dir dist]>');
    process.exit(command ? 1 : 0);
}
