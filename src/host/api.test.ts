import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ApiClient', () => {
  it('injects bearer token from getToken', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([]));
    const client = new ApiClient({ baseUrl: 'http://x/', getToken: () => 'tok', fetchImpl });
    await client.listClusters();
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://x/api/v1/clusters');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer tok');
  });

  it('works without token', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([]));
    const client = new ApiClient({ baseUrl: 'http://x', getToken: () => undefined, fetchImpl });
    await client.listClusters();
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it('throws ApiError on non-2xx', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({}, 403));
    const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
    await expect(client.listClusters()).rejects.toBeInstanceOf(ApiError);
  });

  it('filters catalog items by clusterId', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse([]));
    const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
    await client.listCatalogItems('c 1');
    const [url] = fetchImpl.mock.calls[0] as unknown as [string];
    expect(url).toBe('http://x/api/v1/catalog/items?clusterId=c%201');
  });

  it('approves an approval request', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ id: 'a1', state: 'approved' }));
    const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
    const res = await client.approveApproval('a1');
    expect(res.state).toBe('approved');
    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.method).toBe('POST');
  });
});
