import type { AuthState, Principal } from '../host/auth';
import { createTenantState, type TenantRef, type TenantState } from '../host/tenant';
import { ApiClient, type ApiClientOptions } from '../host/api';
import {
  classifyExtensionError,
  type ExtensionApiError,
  type ExtensionErrorKind,
} from '../host/extension-errors';
import type { SlotContext } from '../blueprints/types';

export function mockPrincipal(overrides: Partial<Principal> = {}): Principal {
  return {
    subject: 'user:dev',
    displayName: 'Dev User',
    groups: ['tenant-acme/platform-team'],
    ...overrides,
  };
}

export function mockAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    principal: mockPrincipal(),
    getToken: () => 'mock-token',
    ...overrides,
  };
}

export function mockTenantState(tenants?: TenantRef[]): TenantState {
  return createTenantState(
    tenants ?? [
      { orgId: 'org:acme', orgName: 'Acme', team: 'platform-team' },
      { orgId: 'org:globex', orgName: 'Globex' },
    ],
  );
}

export function mockApiClient(overrides: Partial<ApiClientOptions> = {}): ApiClient {
  return new ApiClient({
    baseUrl: 'http://mock-control-plane',
    getToken: () => 'mock-token',
    fetchImpl: async () => new Response('[]', { status: 200 }),
    ...overrides,
  });
}

const KIND_DEFAULTS: Record<ExtensionErrorKind, { status: number; code: string }> = {
  'session-expired': { status: 401, code: 'session_expired' },
  'downstream-denied': { status: 403, code: 'downstream_permission_denied' },
  'fga-denied': { status: 403, code: 'fga_denied' },
  'exchange-failed': { status: 502, code: 'exchange_failed' },
  'extension-failure': { status: 500, code: 'extension_failure' },
};

export function mockExtensionError(
  kind: ExtensionErrorKind,
  overrides: { status?: number; extension?: string; requestId?: string; message?: string } = {},
): ExtensionApiError {
  const defaults = KIND_DEFAULTS[kind];
  return classifyExtensionError(
    overrides.status ?? defaults.status,
    {
      error: {
        code: defaults.code,
        message: overrides.message ?? `mock ${kind} error`,
        requestId: overrides.requestId ?? 'mock-request',
        ...(kind === 'session-expired' ? { reauth: { provider: 'mock-provider' } } : {}),
      },
    },
    overrides.extension ?? 'mock-extension',
  );
}

export function mockSlotContext(overrides: Partial<SlotContext> = {}): SlotContext {
  return {
    auth: mockAuthState(),
    tenant: mockTenantState(),
    ...overrides,
  };
}
