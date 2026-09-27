# Host APIs

## Auth context

```tsx
import { AuthProvider, useAuth, usePrincipal } from '@7k-inari/ui-plugin-sdk';
```

`AuthState = { principal: Principal | null; getToken(): Promise<string|undefined> | string | undefined }`. The host wraps remotes in `AuthProvider`. `Principal = { subject, displayName, groups }`.

## Tenant context

```tsx
import { TenantProvider, useTenant, createTenantState } from '@7k-inari/ui-plugin-sdk';
```

`TenantState = { current, available, switchTenant(orgId, team?), onTenantChange(listener) }`. `onTenantChange` returns an unsubscribe function; events carry `{ previous, current }`. `createTenantState` implements the default host-side store (used by the harness shell and tests).

## Typed API client

```ts
import { ApiClient } from '@7k-inari/ui-plugin-sdk';
const api = new ApiClient({ baseUrl, getToken });
```

Thin typed wrapper over the control-plane REST surface: clusters, catalog items, resource instances, approvals. Resource interfaces are `@inari-api`-aligned minimal projections and will be swapped for generated OpenAPI types when `inari-api` ships its TS client. Errors surface as `ApiError` with `status`.

## Extension invocation & typed errors

```ts
import { ApiClient, isExtensionApiError, SessionExpiredError } from '@7k-inari/ui-plugin-sdk';
await api.invokeExtension('my-ext', '/path', { method: 'POST', body: { ... } });
```

`invokeExtension` calls the authenticated proxy path `/api/extensions/<name>/*` and throws a typed `ExtensionApiError` (subclass of `ApiError`) on failure. Discriminate via the `kind` literal (safe across Module Federation realms) or `instanceof`:

| `kind` | class | meaning | `retryable` |
| --- | --- | --- | --- |
| `session-expired` | `SessionExpiredError` | user session/extension token expired; host should run zero-prompt SSO bootstrap and retry once | `true` |
| `downstream-denied` | `DownstreamDeniedError` | upstream provider (e.g. git host) denied the operation | `false` |
| `fga-denied` | `FgaDeniedError` | Inari OpenFGA authorization denied | `false` |
| `exchange-failed` | `ExchangeFailedError` | token exchange / auth-model failure server-side | `false` |
| `extension-failure` | `ExtensionFailureError` | generic/unknown extension failure | `false` |

Metadata for re-auth flows: `requestId`, `extension`, and (for `session-expired`) `reauth: { provider?, hint? }`. Only whitelisted, non-sensitive fields are copied from the server error body — tokens, authorization headers, cookies, and upstream payloads are never exposed on error objects. The SDK never acquires or stores credentials; re-auth and retry are orchestrated by the host (`inari-ui`).

## Design tokens

```ts
import { tokens } from '@7k-inari/ui-plugin-sdk/tokens';
import '@7k-inari/ui-plugin-sdk/tokens.css';
```

TS object plus CSS custom properties (`--inari-*`), light theme by default, dark overrides under `[data-theme='dark']` (spec §8.1).

## Testing

`@7k-inari/ui-plugin-sdk/testing` exports `mockPrincipal`, `mockAuthState`, `mockTenantState`, `mockApiClient`, `mockSlotContext`, `mockExtensionError` for extension unit tests.
