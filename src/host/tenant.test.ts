import { describe, expect, it, vi } from 'vitest';
import { createTenantState } from './tenant';

describe('createTenantState', () => {
  const tenants = [
    { orgId: 'org:acme', orgName: 'Acme', team: 'platform' },
    { orgId: 'org:globex', orgName: 'Globex' },
  ];

  it('defaults to the first tenant', () => {
    const s = createTenantState(tenants);
    expect(s.current?.orgId).toBe('org:acme');
  });

  it('emits change events on switch', () => {
    const s = createTenantState(tenants);
    const listener = vi.fn();
    s.onTenantChange(listener);
    s.switchTenant('org:globex');
    expect(listener).toHaveBeenCalledWith({
      previous: tenants[0],
      current: tenants[1],
    });
    expect(s.current?.orgId).toBe('org:globex');
  });

  it('unsubscribes listeners', () => {
    const s = createTenantState(tenants);
    const listener = vi.fn();
    const off = s.onTenantChange(listener);
    off();
    s.switchTenant('org:globex');
    expect(listener).not.toHaveBeenCalled();
  });

  it('throws on unknown tenant', () => {
    const s = createTenantState(tenants);
    expect(() => s.switchTenant('org:nope')).toThrow('unknown tenant');
  });
});
