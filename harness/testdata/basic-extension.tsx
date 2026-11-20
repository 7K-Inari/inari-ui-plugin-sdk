import { version as reactVersion } from 'react';
import { version as reactDOMVersion } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import {
  CatalogCardBlueprint,
  ClusterTabBlueprint,
  createExtension,
  FormWidgetBlueprint,
  InstanceActionBlueprint,
  NavItemBlueprint,
  PageBlueprint,
} from '@7k-inari/ui-plugin-sdk';

function BasicPage() {
  const location = useLocation();
  return <p>Basic extension at {location.pathname} ({typeof createRoot}) React {reactVersion}/{reactDOMVersion}</p>;
}

export default createExtension({
  manifest: {
    name: 'inari-ext-test',
    version: '0.1.0',
    kind: 'ui',
    title: z.string().parse('Basic'),
  },
  slots: [
    NavItemBlueprint({ name: 'test-nav', title: 'Test', path: '/basic' }),
    CatalogCardBlueprint({ name: 'test-card', component: BasicPage }),
    ClusterTabBlueprint({ name: 'test-tab', title: 'Test', component: BasicPage }),
    InstanceActionBlueprint({ name: 'test-action', label: 'Test', run: () => {} }),
    FormWidgetBlueprint({ name: 'test-widget', component: BasicPage }),
    PageBlueprint({ name: 'basic-page', path: '/basic', component: BasicPage }),
  ],
});
