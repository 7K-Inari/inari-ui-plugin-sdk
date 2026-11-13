import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
let packageSpec;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--package') packageSpec = args[++i];
  else throw new Error(`unknown option: ${args[i]}`);
}

const work = mkdtempSync(join(tmpdir(), 'inari-ui-consumer-'));
const run = (command, commandArgs, cwd) => execFileSync(command, commandArgs, {
  cwd,
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'development', npm_config_include: 'dev' },
  maxBuffer: 20 * 1024 * 1024,
});

try {
  let dependency = packageSpec;
  if (!dependency) {
    run('npm', ['pack', '--pack-destination', work], root);
    const tarball = readdirSync(work).find((name) => name.endsWith('.tgz'));
    if (!tarball) throw new Error('npm pack produced no tarball');
    dependency = join(work, tarball);
  }

  writeFileSync(join(work, 'package.json'), JSON.stringify({
    name: 'inari-ui-public-consumer',
    private: true,
    type: 'module',
    scripts: {
      typecheck: 'tsc --noEmit',
      build: 'inari-ui-ext build ./src/index.tsx --name clean-consumer',
    },
    dependencies: {
      '@7k-inari/ui-plugin-sdk': dependency,
      react: '^19.3.0',
      'react-dom': '^19.3.0',
      'react-router-dom': '^7.0.0',
      zod: '^4.0.0',
    },
    devDependencies: {
      '@types/react': '^19.3.0',
      '@types/react-dom': '^19.3.0',
    },
  }, null, 2));
  writeFileSync(join(work, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      jsx: 'react-jsx',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ['src'],
  }, null, 2));
  mkdirSync(join(work, 'src'), { recursive: true });
  writeFileSync(join(work, 'src/index.tsx'), `import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { createExtension, PageBlueprint } from '@7k-inari/ui-plugin-sdk';

function CleanPage() {
  const location = useLocation();
  return createElement('p', null, 'Clean consumer at ' + location.pathname + ' (' + typeof createRoot + ')');
}

export default createExtension({
  manifest: { name: 'clean-consumer', version: '0.1.0', kind: 'ui', title: z.string().parse('Clean') },
  slots: [PageBlueprint({ name: 'clean-page', path: '/clean', component: CleanPage })],
});
`);
  writeFileSync(join(work, 'consumer-test.mjs'), `import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { ApiClient, SessionExpiredError, extensionContainerName } from '@7k-inari/ui-plugin-sdk';

const requests = [];
const server = createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    requests.push({ method: req.method, url: req.url, auth: req.headers.authorization, body });
    const send = (status, value, headers = {}) => {
      res.writeHead(status, { 'content-type': 'application/json', ...headers });
      res.end(JSON.stringify(value));
    };
    if (req.url === '/api/extensions/clean%20consumer/actions/sync?dryRun=true') return send(200, { ok: true });
    if (req.url === '/api/extensions/clean-consumer/reauth') {
      return send(401, { detail: 're-authentication required', code: 'reauth_required' }, {
        'content-type': 'text/plain; charset=utf-8',
        'X-Inari-Reauth': 'argocd',
      });
    }
    if (req.url === '/api/extensions/clean-consumer/nested') {
      return send(401, { error: { code: 'session_expired', message: 'expired', token: 'secret-token', authorization: 'Bearer abc', reauth: { provider: 'nested-provider' } } });
    }
    send(404, { detail: 'not found', code: 'not_found' });
  });
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const baseUrl = 'http://127.0.0.1:' + address.port;
let tokenNumber = 0;
const client = new ApiClient({ baseUrl, getToken: () => 'token-' + (++tokenNumber) });
try {
  const result = await client.invokeExtension('clean consumer', '/actions/sync?dryRun=true', {
    method: 'POST', body: { application: 'demo' },
  });
  assert.deepEqual(result, { ok: true });
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, '/api/extensions/clean%20consumer/actions/sync?dryRun=true');
  assert.equal(requests[0].auth, 'Bearer token-1');
  assert.deepEqual(JSON.parse(requests[0].body), { application: 'demo' });

  const reauth = await client.invokeExtension('clean-consumer', '/reauth').catch((error) => error);
  assert.ok(reauth instanceof SessionExpiredError);
  assert.equal(reauth.kind, 'session-expired');
  assert.equal(reauth.retryable, true);
  assert.deepEqual(reauth.reauth, { provider: 'argocd' });

  const nested = await client.invokeExtension('clean-consumer', '/nested').catch((error) => error);
  assert.ok(nested instanceof SessionExpiredError);
  assert.deepEqual(nested.reauth, { provider: 'nested-provider' });
  assert.equal(JSON.stringify(nested).includes('secret-token'), false);
  assert.equal(JSON.stringify(nested).includes('Bearer abc'), false);

  const countBeforeReject = requests.length;
  await assert.rejects(client.invokeExtension('clean-consumer', '/../admin'), /dot segments/);
  assert.equal(requests.length, countBeforeReject);
  assert.equal(extensionContainerName('clean-consumer'), 'clean_consumer');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
console.log('invokeExtension and re-auth consumer checks passed');
`);

  run('npm', ['install', '--no-audit', '--no-fund'], work);
  run('node', ['consumer-test.mjs'], work);
  run('node', ['--input-type=module', '-e', "import { createMockControlPlane } from '@7k-inari/ui-plugin-sdk/harness'; const server = createMockControlPlane(); server.close();"], work);
  run('npm', ['run', 'typecheck'], work);
  run('npm', ['run', 'build'], work);

  const remoteEntry = join(work, 'dist/remoteEntry.js');
  if (!existsSync(remoteEntry) || statSync(remoteEntry).size === 0) throw new Error('consumer build did not emit remoteEntry.js');
  const remoteSource = readFileSync(remoteEntry, 'utf8');
  if (!remoteSource.includes('clean_consumer')) throw new Error('remoteEntry.js lacks normalized container name');

  const sdkRoot = join(work, 'node_modules/@7k-inari/ui-plugin-sdk');
  const manifest = JSON.parse(readFileSync(join(sdkRoot, 'package.json'), 'utf8'));
  for (const file of [
    'dist/index.js',
    'dist/harness/build.js',
    'bin/inari-ui-ext.mjs',
    'templates/extension/package.json',
    'harness/shell/main.tsx',
    'src/tokens/tokens.css',
  ]) {
    if (!existsSync(join(sdkRoot, file))) throw new Error(`published package missing ${file}`);
  }
  for (const dependency of ['webpack', 'ts-loader', 'typescript', 'vite', '@vitejs/plugin-react']) {
    if (!manifest.dependencies?.[dependency]) throw new Error(`published runtime dependency missing: ${dependency}`);
  }
  if (!manifest.peerDependencies?.['react-router-dom']) throw new Error('react-router-dom peer contract missing');
  if (manifest.scripts?.postinstall || manifest.scripts?.prepare) throw new Error('published package requires an install-time build hook');
  console.log(`clean UI consumer passed: ${dependency}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
