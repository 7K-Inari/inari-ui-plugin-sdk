import { createExtension, NavItemBlueprint, PageBlueprint, ClusterTabBlueprint } from '@inari/ui-plugin-sdk';

export default createExtension({
  manifest: {
    name: 'my-inari-extension',
    version: '0.1.0',
    kind: 'ui',
    title: 'My Extension',
  },
  slots: [
    NavItemBlueprint({ name: 'my-nav', title: 'My Extension', path: '/my-extension' }),
    PageBlueprint({
      name: 'my-page',
      path: '/my-extension',
      title: 'My Extension',
      component: ({ context }) => (
        <div>
          <h2>Hello from my extension</h2>
          <p>Current tenant: {context.tenant.current?.orgName ?? 'unknown'}</p>
        </div>
      ),
    }),
    ClusterTabBlueprint({
      name: 'my-cluster-tab',
      title: 'My Tab',
      component: ({ cluster }) => <p>Cluster {cluster.name} is {cluster.state}</p>,
    }),
  ],
});
