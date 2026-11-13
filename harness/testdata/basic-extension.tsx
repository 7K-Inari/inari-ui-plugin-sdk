import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { createExtension, PageBlueprint } from '@7k-inari/ui-plugin-sdk';

function BasicPage() {
  const location = useLocation();
  return createElement('p', null, `Basic extension at ${location.pathname} (${typeof createRoot})`);
}

export default createExtension({
  manifest: {
    name: 'inari-ext-test',
    version: '0.1.0',
    kind: 'ui',
    title: z.string().parse('Basic'),
  },
  slots: [
    PageBlueprint({ name: 'basic-page', path: '/basic', component: BasicPage }),
  ],
});
