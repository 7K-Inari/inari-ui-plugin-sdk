import { version as reactVersion } from 'react';
import { version as reactDOMVersion } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { useLocation } from 'react-router-dom';
import { z } from 'zod';
import { createExtension, PageBlueprint } from '@7k-inari/ui-plugin-sdk';

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
    PageBlueprint({ name: 'basic-page', path: '/basic', component: BasicPage }),
  ],
});
