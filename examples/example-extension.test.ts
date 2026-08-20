import { describe, expect, it } from 'vitest';
import extension from './example-extension';

describe('example extension', () => {
  it('has a valid manifest and registered slots', () => {
    expect(extension.manifest.name).toBe('inari-ext-example');
    expect(extension.manifest.slots.map((s) => s.kind).sort()).toEqual([
      'catalog-card',
      'cluster-tab',
      'instance-action',
      'nav-item',
      'page',
    ]);
  });
});
