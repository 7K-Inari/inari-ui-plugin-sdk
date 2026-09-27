import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError } from './api';
import {
  ExtensionApiError,
  ExtensionFailureError,
  FgaDeniedError,
  SessionExpiredError,
} from './extension-errors';

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

  describe('invokeExtension', () => {
    it('invokes the extension proxy path and returns parsed JSON', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ ok: true }));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const res = await client.invokeExtension<{ ok: boolean }>('git-ext', '/repos');
      expect(res.ok).toBe(true);
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('http://x/api/extensions/git-ext/repos');
      expect(init.method).toBe('GET');
      expect((init.headers as Record<string, string>).authorization).toBe('Bearer t');
    });

    it('encodes extension name and supports method/body init', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({}));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      await client.invokeExtension('my ext', '/do', { method: 'POST', body: { a: 1 } });
      const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe('http://x/api/extensions/my%20ext/do');
      expect(init.method).toBe('POST');
      expect(init.body).toBe(JSON.stringify({ a: 1 }));
    });

    it('throws typed SessionExpiredError with reauth metadata on 401', async () => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          { error: { code: 'session_expired', message: 'expired', requestId: 'r1', reauth: { provider: 'github' } } },
          401,
        ),
      );
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = await client.invokeExtension('git-ext', '/repos').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(SessionExpiredError);
      const ext = err as SessionExpiredError;
      expect(ext.retryable).toBe(true);
      expect(ext.requestId).toBe('r1');
      expect(ext.extension).toBe('git-ext');
      expect(ext.reauth).toEqual({ provider: 'github' });
    });

    it('distinguishes 403 fga denial from 401', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'fga_denied' } }, 403));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = await client.invokeExtension('git-ext', '/repos').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(FgaDeniedError);
      expect((err as FgaDeniedError).retryable).toBe(false);
    });

    it('falls back to generic extension failure on non-JSON error body', async () => {
      const fetchImpl = vi.fn(async () => new Response('boom', { status: 500 }));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = await client.invokeExtension('git-ext', '/repos').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ExtensionFailureError);
      expect(err).toBeInstanceOf(ExtensionApiError);
    });

    it('does not leak sensitive response fields into thrown errors', async () => {
      const fetchImpl = vi.fn(async () =>
        jsonResponse(
          { error: { code: 'session_expired', token: 'secret', authorization: 'Bearer abc' } },
          401,
        ),
      );
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = (await client.invokeExtension('git-ext', '/repos').catch((e: unknown) => e)) as Error;
      expect(JSON.stringify(err)).not.toContain('secret');
      expect(JSON.stringify(err)).not.toContain('Bearer abc');
    });

    it('throws ExtensionFailureError when a successful response is not JSON', async () => {
      const fetchImpl = vi.fn(async () => new Response('<html>nope', { status: 200 }));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = await client.invokeExtension('git-ext', '/repos').catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ExtensionFailureError);
      expect((err as ExtensionFailureError).extension).toBe('git-ext');
      expect((err as ExtensionFailureError).message).toContain('non-JSON');
    });

    it('returns undefined for empty successful responses', async () => {
      const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      await expect(client.invokeExtension('git-ext', '/repos')).resolves.toBeUndefined();
    });

    it('keeps existing methods throwing plain ApiError, not ExtensionApiError', async () => {
      const fetchImpl = vi.fn(async () => jsonResponse({ error: { code: 'session_expired' } }, 401));
      const client = new ApiClient({ baseUrl: 'http://x', getToken: () => 't', fetchImpl });
      const err = await client.listClusters().catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ApiError);
      expect(err).not.toBeInstanceOf(ExtensionApiError);
    });
  });
});
