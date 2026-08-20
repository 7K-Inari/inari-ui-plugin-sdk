import { describe, expect, it } from 'vitest';
import { startMockControlPlane } from './server';

describe('mock control plane', () => {
  it('serves default fixtures', async () => {
    const { url, close } = await startMockControlPlane(0);
    try {
      const clusters = await fetch(`${url}/api/v1/clusters`).then((r) => r.json());
      expect(Array.isArray(clusters)).toBe(true);
      const tenants = await fetch(`${url}/api/v1/tenants`).then((r) => r.json());
      expect(tenants[0].orgId).toBe('org:acme');
    } finally {
      await close();
    }
  });

  it('honors fixture overrides and 404s', async () => {
    const { url, close } = await startMockControlPlane(0, { clusters: [] });
    try {
      const clusters = await fetch(`${url}/api/v1/clusters`).then((r) => r.json());
      expect(clusters).toEqual([]);
      const res = await fetch(`${url}/api/v1/clusters/nope`);
      expect(res.status).toBe(404);
    } finally {
      await close();
    }
  });
});
