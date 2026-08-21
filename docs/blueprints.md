# Blueprint contract

Inari UI extensions are **blueprint-driven** (Backstage new-frontend style): an extension never renders free-form into the host. It contributes typed slots, each created by a blueprint factory and registered through `createExtension`.

```ts
import { createExtension, NavItemBlueprint, PageBlueprint } from '@7k-inari/ui-plugin-sdk';

export default createExtension({
  manifest: { name: 'my-extension', version: '0.1.0', kind: 'ui' },
  slots: [
    NavItemBlueprint({ name: 'my-nav', title: 'Mine', path: '/mine' }),
    PageBlueprint({ name: 'my-page', path: '/mine', component: MyPage }),
  ],
});
```

## Slots (spec §8.4)

| Blueprint | Props/context received | Static options |
|---|---|---|
| `NavItemBlueprint` | none | `title`, `path`, `icon?` |
| `CatalogCardBlueprint` | `{ catalogItem: CatalogItem }` | — |
| `ClusterTabBlueprint` | `{ cluster: Cluster }` | `title` |
| `InstanceActionBlueprint` | host calls `props.run(instance)` | `label` |
| `FormWidgetBlueprint<T>` | `{ value, onChange, schema, disabled? }` | `schemaType?` |
| `PageBlueprint` | `{ context: SlotContext }` (auth + tenant) | `path`, `title?` |

## Manifest validation

`createExtension` derives the manifest `slots` array from the contributions and validates the whole manifest with zod (`parseExtensionManifest` is exported for the host/backend registry). Rules: kebab-case `name`, `version`, `kind: 'ui'`, at least one slot, slot kinds restricted to the six above.
