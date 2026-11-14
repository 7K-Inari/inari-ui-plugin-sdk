import { ApiError } from './api-error';

export type ExtensionErrorKind =
  | 'session-expired'
  | 'downstream-denied'
  | 'fga-denied'
  | 'exchange-failed'
  | 'extension-failure';

export interface ExtensionReauthMeta {
  provider?: string;
  hint?: string;
}

const CODE_TO_KIND: Record<string, ExtensionErrorKind> = {
  session_expired: 'session-expired',
  reauth_required: 'session-expired',
  downstream_permission_denied: 'downstream-denied',
  inari_fga_denied: 'fga-denied',
  fga_denied: 'fga-denied',
  permission_denied: 'fga-denied',
  auth_unavailable: 'exchange-failed',
  exchange_failed: 'exchange-failed',
  auth_model_failure: 'exchange-failed',
};

export abstract class ExtensionApiError extends ApiError {
  abstract readonly kind: ExtensionErrorKind;
  readonly retryable: boolean = false;
  readonly requestId?: string;
  readonly extension?: string;
  readonly reauth?: ExtensionReauthMeta;

  constructor(
    status: number,
    message: string,
    meta: { requestId?: string; extension?: string; reauth?: ExtensionReauthMeta } = {},
  ) {
    super(status, message);
    this.name = new.target.name;
    if (meta.requestId !== undefined) this.requestId = meta.requestId;
    if (meta.extension !== undefined) this.extension = meta.extension;
    if (meta.reauth !== undefined) this.reauth = meta.reauth;
  }
}

export class SessionExpiredError extends ExtensionApiError {
  readonly kind = 'session-expired' as const;
  readonly retryable = true;
}

export class DownstreamDeniedError extends ExtensionApiError {
  readonly kind = 'downstream-denied' as const;
}

export class FgaDeniedError extends ExtensionApiError {
  readonly kind = 'fga-denied' as const;
}

export class ExchangeFailedError extends ExtensionApiError {
  readonly kind = 'exchange-failed' as const;
}

export class ExtensionFailureError extends ExtensionApiError {
  readonly kind = 'extension-failure' as const;
}

export type AnyExtensionApiError =
  | SessionExpiredError
  | DownstreamDeniedError
  | FgaDeniedError
  | ExchangeFailedError
  | ExtensionFailureError;

const KIND_TO_CLASS = {
  'session-expired': SessionExpiredError,
  'downstream-denied': DownstreamDeniedError,
  'fga-denied': FgaDeniedError,
  'exchange-failed': ExchangeFailedError,
  'extension-failure': ExtensionFailureError,
} as const;

export function isExtensionApiError(err: unknown): err is ExtensionApiError {
  return err instanceof ExtensionApiError;
}

interface ParsedErrorBody {
  code?: string;
  message?: string;
  requestId?: string;
  reauth?: ExtensionReauthMeta;
}

function parseReauth(value: unknown): ExtensionReauthMeta | undefined {
  if (typeof value !== 'object' || value === null) return undefined;
  const rec = value as Record<string, unknown>;
  const reauth: ExtensionReauthMeta = {};
  if (typeof rec.provider === 'string') reauth.provider = rec.provider;
  if (typeof rec.hint === 'string') reauth.hint = rec.hint;
  return reauth;
}

function parseBody(body: unknown): ParsedErrorBody {
  if (typeof body !== 'object' || body === null) return {};
  const outer = body as Record<string, unknown>;
  const nested = outer.error;
  const rec = typeof nested === 'object' && nested !== null
    ? nested as Record<string, unknown>
    : outer;
  const out: ParsedErrorBody = {};
  if (typeof rec.code === 'string') out.code = rec.code;
  if (typeof rec.message === 'string') out.message = rec.message;
  else if (typeof rec.detail === 'string') out.message = rec.detail;
  if (typeof rec.requestId === 'string') out.requestId = rec.requestId;
  else if (typeof rec.request_id === 'string') out.requestId = rec.request_id;
  out.reauth = parseReauth(rec.reauth);
  return out;
}

function fallbackKind(status: number): ExtensionErrorKind {
  if (status === 401) return 'session-expired';
  if (status === 403) return 'fga-denied';
  return 'extension-failure';
}

const MAX_MESSAGE_LENGTH = 300;
const PROVIDER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

function sanitizeMessage(message: string): string {
  return message.length > MAX_MESSAGE_LENGTH
    ? `${message.slice(0, MAX_MESSAGE_LENGTH)}…`
    : message;
}

export function classifyExtensionError(
  status: number,
  body: unknown,
  extension?: string,
  headers?: Headers,
): AnyExtensionApiError {
  const parsed = parseBody(body);
  const mapped = parsed.code ? CODE_TO_KIND[parsed.code] : undefined;
  const kind = mapped ?? fallbackKind(status);
  const message = parsed.message !== undefined
    ? sanitizeMessage(parsed.message)
    : `extension invocation failed: ${status}`;
  const meta: { requestId?: string; extension?: string; reauth?: ExtensionReauthMeta } = {};
  if (parsed.requestId !== undefined) meta.requestId = parsed.requestId;
  if (extension !== undefined) meta.extension = extension;
  if (kind === 'session-expired') {
    if (parsed.reauth !== undefined) {
      meta.reauth = parsed.reauth;
    } else {
      const provider = headers?.get('X-Inari-Reauth');
      if (provider && PROVIDER_PATTERN.test(provider)) meta.reauth = { provider };
    }
  }
  const Cls = KIND_TO_CLASS[kind];
  return new Cls(status, message, meta);
}
