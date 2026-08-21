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

## Design tokens

```ts
import { tokens } from '@7k-inari/ui-plugin-sdk/tokens';
import '@7k-inari/ui-plugin-sdk/tokens.css';
```

TS object plus CSS custom properties (`--inari-*`), light theme by default, dark overrides under `[data-theme='dark']` (spec §8.1).

## Testing

`@7k-inari/ui-plugin-sdk/testing` exports `mockPrincipal`, `mockAuthState`, `mockTenantState`, `mockApiClient`, `mockSlotContext` for extension unit tests.
