import { intersects, validRange } from 'semver';

export const UI_HOST_API_V1 = 'inari.ui.v1';
export const UI_PLUGIN_SDK_RANGE = '>=0.1.8 <2.0.0';
export const SUPPORTED_UI_HOST_APIS = [UI_HOST_API_V1] as const;

export interface UIContractDeclaration {
  sdk: string;
  hostApi: string;
}

export type UICompatibilityReason =
  | 'contract_required'
  | 'contract_malformed'
  | 'contract_unsupported'
  | 'declaration_mismatch'
  | 'legacy';

export interface UICompatibilityResult {
  status: 'compatible' | 'legacy' | 'incompatible';
  reason?: UICompatibilityReason;
  required: { hostApis: readonly string[]; sdkRange: string };
  actual: { registry?: UIContractDeclaration; remote?: UIContractDeclaration };
}

export interface UICompatibilityInput {
  registry?: UIContractDeclaration;
  remote?: UIContractDeclaration;
  supportedHostApis?: readonly string[];
  supportedSdkRange?: string;
  requireContracts?: boolean;
}

function validDeclaration(value: UIContractDeclaration): boolean {
  return value.hostApi.trim().length > 0 && validRange(value.sdk) !== null;
}

export function evaluateUICompatibility(input: UICompatibilityInput): UICompatibilityResult {
  const required = {
    hostApis: input.supportedHostApis ?? SUPPORTED_UI_HOST_APIS,
    sdkRange: input.supportedSdkRange ?? UI_PLUGIN_SDK_RANGE,
  };
  const actual = { registry: input.registry, remote: input.remote };
  const result = (status: UICompatibilityResult['status'], reason?: UICompatibilityReason): UICompatibilityResult => ({
    status,
    reason,
    required,
    actual,
  });

  if (validRange(required.sdkRange) === null || required.hostApis.length === 0) {
    return result('incompatible', 'contract_malformed');
  }
  for (const declaration of [actual.registry, actual.remote]) {
    if (declaration && !validDeclaration(declaration)) {
      return result('incompatible', 'contract_malformed');
    }
  }
  if (actual.registry && actual.remote) {
    if (actual.registry.hostApi !== actual.remote.hostApi || !intersects(actual.registry.sdk, actual.remote.sdk)) {
      return result('incompatible', 'declaration_mismatch');
    }
  }
  for (const declaration of [actual.registry, actual.remote]) {
    if (!declaration) continue;
    if (!required.hostApis.includes(declaration.hostApi) || !intersects(declaration.sdk, required.sdkRange)) {
      return result('incompatible', 'contract_unsupported');
    }
  }
  if (input.requireContracts && (!actual.registry || !actual.remote)) {
    return result('incompatible', 'contract_required');
  }
  if (!actual.registry || !actual.remote) {
    return result('legacy', 'legacy');
  }
  return result('compatible');
}
