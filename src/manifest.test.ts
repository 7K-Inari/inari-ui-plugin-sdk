import { describe, expect, it } from 'vitest';
import { parseExtensionManifest } from './manifest';

describe('parseExtensionManifest', () => {
  it('parses a valid manifest', () => {
    const m = parseExtensionManifest({
      name: 'inari-ext-argocd',
      version: '0.1.0',
      kind: 'ui',
      slots: [{ kind: 'nav-item', name: 'argocd-nav' }],
    });
    expect(m.name).toBe('inari-ext-argocd');
    expect(m.slots).toHaveLength(1);
  });

  it('rejects wrong kind', () => {
    expect(() =>
      parseExtensionManifest({
        name: 'x',
        version: '1.0.0',
        kind: 'backend',
        slots: [{ kind: 'page', name: 'p' }],
      }),
    ).toThrow();
  });

  it('rejects bad slot kind', () => {
    expect(() =>
      parseExtensionManifest({
        name: 'x',
        version: '1.0.0',
        kind: 'ui',
        slots: [{ kind: 'free-form', name: 'p' }],
      }),
    ).toThrow();
  });

  it('rejects empty slots', () => {
    expect(() =>
      parseExtensionManifest({ name: 'x', version: '1.0.0', kind: 'ui', slots: [] }),
    ).toThrow();
  });

  it('rejects non kebab-case name', () => {
    expect(() =>
      parseExtensionManifest({
        name: 'Bad_Name',
        version: '1.0.0',
        kind: 'ui',
        slots: [{ kind: 'page', name: 'p' }],
      }),
    ).toThrow();
  });
});
