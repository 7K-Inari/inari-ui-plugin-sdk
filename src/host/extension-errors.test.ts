import { describe, expect, it } from 'vitest';
import {
  classifyExtensionError,
  DownstreamDeniedError,
  ExchangeFailedError,
  ExtensionApiError,
  ExtensionFailureError,
  FgaDeniedError,
  isExtensionApiError,
  SessionExpiredError,
  type AnyExtensionApiError,
  type ExtensionErrorKind,
} from './extension-errors';
import { ApiError } from './api';

describe('classifyExtensionError', () => {
  it('maps session_expired code to SessionExpiredError with reauth metadata', () => {
    const err = classifyExtensionError(
      401,
      { error: { code: 'session_expired', message: 'session expired', requestId: 'req-1', reauth: { provider: 'github', hint: 'sso' } } },
      'git',
    );
    expect(err).toBeInstanceOf(SessionExpiredError);
    expect(err).toBeInstanceOf(ExtensionApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.kind).toBe('session-expired');
    expect(err.retryable).toBe(true);
    expect(err.requestId).toBe('req-1');
    expect(err.extension).toBe('git');
    expect(err.reauth).toEqual({ provider: 'github', hint: 'sso' });
    expect(err.message).toBe('session expired');
  });

  it('maps reauth_required code to SessionExpiredError', () => {
    const err = classifyExtensionError(401, { error: { code: 'reauth_required' } }, 'git');
    expect(err).toBeInstanceOf(SessionExpiredError);
    expect(err.retryable).toBe(true);
  });

  it('maps downstream permission denied code', () => {
    const err = classifyExtensionError(
      403,
      { error: { code: 'downstream_permission_denied', message: 'github denied' } },
      'git',
    );
    expect(err).toBeInstanceOf(DownstreamDeniedError);
    expect(err.kind).toBe('downstream-denied');
    expect(err.retryable).toBe(false);
  });

  it('maps fga_denied code', () => {
    const err = classifyExtensionError(403, { error: { code: 'fga_denied' } }, 'git');
    expect(err).toBeInstanceOf(FgaDeniedError);
    expect(err.kind).toBe('fga-denied');
    expect(err.retryable).toBe(false);
  });

  it('maps exchange/auth-model failure codes', () => {
    for (const code of ['exchange_failed', 'auth_model_failure']) {
      const err = classifyExtensionError(502, { error: { code } }, 'git');
      expect(err).toBeInstanceOf(ExchangeFailedError);
      expect(err.kind).toBe('exchange-failed');
      expect(err.retryable).toBe(false);
    }
  });

  it('falls back to status mapping when code is unknown', () => {
    expect(classifyExtensionError(401, { error: { code: 'weird' } }, 'git')).toBeInstanceOf(SessionExpiredError);
    expect(classifyExtensionError(403, undefined, 'git')).toBeInstanceOf(FgaDeniedError);
    expect(classifyExtensionError(500, undefined, 'git')).toBeInstanceOf(ExtensionFailureError);
  });

  it('falls back on malformed body', () => {
    const err = classifyExtensionError(500, 'not json', 'git');
    expect(err).toBeInstanceOf(ExtensionFailureError);
    expect(err.kind).toBe('extension-failure');
    expect(err.retryable).toBe(false);
  });

  it('redacts sensitive fields from the error body', () => {
    const err = classifyExtensionError(
      401,
      {
        error: {
          code: 'session_expired',
          message: 'expired',
          token: 'secret-token',
          authorization: 'Bearer abc',
          setCookie: 'session=xyz',
          upstreamHeaders: { authorization: 'Bearer abc' },
        },
      },
      'git',
    );
    const serialized = JSON.stringify(err);
    expect(serialized).not.toContain('secret-token');
    expect(serialized).not.toContain('Bearer abc');
    expect(serialized).not.toContain('session=xyz');
    const rec = err as unknown as Record<string, unknown>;
    for (const key of ['token', 'authorization', 'setCookie', 'upstreamHeaders', 'code']) {
      expect(rec[key]).toBeUndefined();
    }
    expect(rec.kind).toBe('session-expired');
    expect(rec.status).toBe(401);
  });

  it('truncates overly long server messages', () => {
    const long = 'x'.repeat(1000);
    const err = classifyExtensionError(500, { error: { code: 'boom', message: long } }, 'git');
    expect(err.message.length).toBeLessThanOrEqual(301);
    expect(err.message.endsWith('…')).toBe(true);
  });

  it('drops non-string reauth fields', () => {
    const err = classifyExtensionError(
      401,
      { error: { code: 'session_expired', reauth: { provider: 42, hint: { nested: 'x' } } } },
      'git',
    );
    expect(err.reauth).toEqual({});
  });
});

describe('isExtensionApiError', () => {
  it('narrows extension errors', () => {
    const err = classifyExtensionError(403, { error: { code: 'fga_denied' } }, 'git');
    expect(isExtensionApiError(err)).toBe(true);
    expect(isExtensionApiError(new ApiError(500, 'x'))).toBe(false);
    expect(isExtensionApiError(new Error('x'))).toBe(false);
    expect(isExtensionApiError('x')).toBe(false);
  });
});

describe('kind discrimination (type-level)', () => {
  it('switch over kind is exhaustive', () => {
    const err = classifyExtensionError(500, undefined, 'git');
    const label = (e: AnyExtensionApiError): string => {
      switch (e.kind) {
        case 'session-expired':
          return e.reauth?.provider ?? 'session-expired';
        case 'downstream-denied':
          return 'downstream';
        case 'fga-denied':
          return 'fga';
        case 'exchange-failed':
          return 'exchange';
        case 'extension-failure':
          return 'generic';
        default: {
          const never: never = e;
          return never;
        }
      }
    };
    expect(label(err)).toBe('generic');
    const kinds: ExtensionErrorKind[] = [
      'session-expired',
      'downstream-denied',
      'fga-denied',
      'exchange-failed',
      'extension-failure',
    ];
    expect(kinds).toHaveLength(5);
  });
});
