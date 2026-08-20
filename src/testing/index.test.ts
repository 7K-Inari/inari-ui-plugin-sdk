import { describe, expect, it, vi } from 'vitest';
import { mockSlotContext, mockTenantState } from './index';

describe('testing module', () => {
  it('builds a slot context with defaults', () => {
    const ctx = mockSlotContext();
    expect(ctx.auth.principal?.subject).toBe('user:dev');
    expect(ctx.tenant.current?.orgId).toBe('org:acme');
  });

  it('tenant switching emits events', () => {
    const tenant = mockTenantState();
    const l = vi.fn();
    tenant.onTenantChange(l);
    tenant.switchTenant('org:globex');
    expect(l).toHaveBeenCalledOnce();
  });
});
