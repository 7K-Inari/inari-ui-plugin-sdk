import { createElement } from 'react';
import {
  createExtension,
  NavItemBlueprint,
  PageBlueprint,
  ClusterTabBlueprint,
  CatalogCardBlueprint,
  InstanceActionBlueprint,
} from '@7k-inari/ui-plugin-sdk';

export default createExtension({
  manifest: {
    name: 'inari-ext-example',
    version: '0.1.0',
    kind: 'ui',
    title: 'Example Extension',
  },
  slots: [
    NavItemBlueprint({ name: 'example-nav', title: 'Example', path: '/example' }),
    PageBlueprint({
      name: 'example-page',
      path: '/example',
      title: 'Example',
      component: () =>
        createElement('div', null, [
          createElement('h2', { key: 'h' }, 'Example extension page'),
          createElement('p', { key: 'p' }, 'Running standalone against the mock control plane.'),
        ]),
    }),
    ClusterTabBlueprint({
      name: 'example-cluster-tab',
      title: 'Example',
      component: ({ cluster }) =>
        createElement('p', null, `Example tab for cluster ${cluster.name} (${cluster.state})`),
    }),
    CatalogCardBlueprint({
      name: 'example-catalog-card',
      component: ({ catalogItem }) =>
        createElement('small', null, `example badge: ${catalogItem.source}`),
    }),
    InstanceActionBlueprint({
      name: 'example-action',
      label: 'Example Action',
      run: (instance) => {
        console.log(`example action on ${instance.name}`);
      },
    }),
  ],
});
