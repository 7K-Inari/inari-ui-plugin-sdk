import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';

export interface MockFixtures {
  clusters?: unknown[];
  catalogItems?: unknown[];
  resources?: unknown[];
  approvals?: unknown[];
  tenants?: unknown[];
}

export const defaultFixtures: Required<MockFixtures> = {
  tenants: [
    { orgId: 'org:acme', orgName: 'Acme', team: 'platform-team' },
    { orgId: 'org:globex', orgName: 'Globex' },
  ],
  clusters: [
    {
      id: 'cluster-1',
      name: 'dev-eu-1',
      tenantId: 'org:acme',
      state: 'Active',
      kubernetesVersion: '1.31',
      labels: { env: 'dev', region: 'eu-west-1' },
    },
  ],
  catalogItems: [
    {
      id: 'item-1',
      name: 'namespace-as-a-service',
      source: 'curated',
      version: '1.0.0',
      description: 'Golden-path namespace',
    },
  ],
  resources: [
    {
      id: 'res-1',
      catalogItemId: 'item-1',
      clusterId: 'cluster-1',
      name: 'demo-ns',
      namespace: 'demo-ns',
      health: 'Healthy',
      ownerTeam: 'platform-team',
    },
  ],
  approvals: [],
};

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => resolve(data));
  });
}

export function createMockControlPlane(fixtures: MockFixtures = {}): Server {
  const fx: Required<MockFixtures> = { ...defaultFixtures, ...fixtures };
  return createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const path = url.pathname;
    res.setHeader('content-type', 'application/json');
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-headers', 'content-type, authorization');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }
    const send = (body: unknown, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && path === '/api/v1/tenants') return send(fx.tenants);
    if (req.method === 'GET' && path === '/api/v1/clusters') return send(fx.clusters);
    if (req.method === 'GET' && path === '/api/v1/catalog/items') return send(fx.catalogItems);
    if (req.method === 'GET' && path === '/api/v1/resources') return send(fx.resources);
    if (req.method === 'GET' && path === '/api/v1/approvals') return send(fx.approvals);
    const clusterMatch = path.match(/^\/api\/v1\/clusters\/([^/]+)$/);
    if (req.method === 'GET' && clusterMatch) {
      const c = fx.clusters.find((x) => (x as { id: string }).id === clusterMatch[1]);
      return c ? send(c) : send({ message: 'not found' }, 404);
    }
    const resMatch = path.match(/^\/api\/v1\/resources\/([^/]+)$/);
    if (req.method === 'GET' && resMatch) {
      const r = fx.resources.find((x) => (x as { id: string }).id === resMatch[1]);
      return r ? send(r) : send({ message: 'not found' }, 404);
    }
    const approveMatch = path.match(/^\/api\/v1\/approvals\/([^/]+)\/approve$/);
    if (req.method === 'POST' && approveMatch) {
      await readBody(req);
      return send({ id: approveMatch[1], state: 'approved' });
    }
    send({ message: 'not found' }, 404);
  });
}

export function startMockControlPlane(
  port: number,
  fixtures?: MockFixtures,
): Promise<{ server: Server; url: string; close: () => Promise<void> }> {
  const server = createMockControlPlane(fixtures);
  return new Promise((resolve) => {
    server.listen(port, () => {
      const addr = server.address();
      const actualPort = typeof addr === 'object' && addr ? addr.port : port;
      resolve({
        server,
        url: `http://localhost:${actualPort}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}
