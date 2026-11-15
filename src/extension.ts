import { UI_HOST_API_V1, UI_PLUGIN_SDK_RANGE } from './contracts';
import type { ExtensionManifestInput } from './manifest';
import { parseExtensionManifest } from './manifest';
import type { AnySlotContribution, InariExtension } from './blueprints/types';

export interface CreateExtensionParams {
  manifest: Omit<ExtensionManifestInput, 'slots'>;
  slots: AnySlotContribution[];
}

export function createExtension(params: CreateExtensionParams): InariExtension {
  const explicit = params.manifest.contracts?.ui;
  if (explicit && (explicit.hostApi !== UI_HOST_API_V1 || explicit.sdk !== UI_PLUGIN_SDK_RANGE)) {
    throw new Error(
      `extension contracts.ui must match this SDK (${UI_HOST_API_V1}, ${UI_PLUGIN_SDK_RANGE})`,
    );
  }
  const slotDescriptors = params.slots.map((s) => ({ kind: s.kind, name: s.name }));
  const manifest = parseExtensionManifest({
    ...params.manifest,
    contracts: {
      ...params.manifest.contracts,
      ui: { hostApi: UI_HOST_API_V1, sdk: UI_PLUGIN_SDK_RANGE },
    },
    slots: slotDescriptors,
  });
  return { manifest, slots: params.slots };
}
