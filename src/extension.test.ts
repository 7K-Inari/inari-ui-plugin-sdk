import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { createExtension } from './extension';
import { NavItemBlueprint } from './blueprints/nav-item';
import { PageBlueprint } from './blueprints/page';
import { ClusterTabBlueprint } from './blueprints/cluster-tab';
import { CatalogCardBlueprint } from './blueprints/catalog-card';
import { InstanceActionBlueprint } from './blueprints/instance-action';
import { FormWidgetBlueprint } from './blueprints/form-widget';

const Dummy = () => createElement('div');

describe('createExtension', () => {
  it('derives the manifest slot list from contributions', () => {
    const ext = createExtension({
      manifest: { name: 'inari-ext-argocd', version: '0.1.0', kind: 'ui' },
      slots: [
        NavItemBlueprint({ name: 'argocd-nav', title: 'ArgoCD', path: '/argocd' }),
        PageBlueprint({ name: 'argocd-page', path: '/argocd', component: Dummy }),
        ClusterTabBlueprint({ name: 'argocd-tab', title: 'ArgoCD', component: Dummy }),
        CatalogCardBlueprint({ name: 'argocd-card', component: Dummy }),
        InstanceActionBlueprint({ name: 'argocd-sync', label: 'Sync', run: vi_fn() }),
        FormWidgetBlueprint({ name: 'secret-picker', component: Dummy }),
      ],
    });
    expect(ext.manifest.slots.map((s) => s.kind)).toEqual([
      'nav-item',
      'page',
      'cluster-tab',
      'catalog-card',
      'instance-action',
      'form-widget',
    ]);
    expect(ext.slots).toHaveLength(6);
  });

  it('rejects an invalid manifest', () => {
    expect(() =>
      createExtension({
        manifest: { name: 'Bad Name', version: '0.1.0', kind: 'ui' },
        slots: [NavItemBlueprint({ name: 'n', title: 't', path: '/p' })],
      }),
    ).toThrow();
  });

  it('rejects an extension with no slots', () => {
    expect(() =>
      createExtension({
        manifest: { name: 'x', version: '0.1.0', kind: 'ui' },
        slots: [],
      }),
    ).toThrow();
  });
});

function vi_fn() {
  return () => {};
}
