import { describe, expect, it } from 'vitest';
import { satisfies } from 'semver';
import {
  evaluateUICompatibility,
  UI_HOST_API_V1,
  UI_PLUGIN_SDK_RANGE,
} from './contracts';
import packageJson from '../package.json' with { type: 'json' };

const v1 = { hostApi: UI_HOST_API_V1, sdk: UI_PLUGIN_SDK_RANGE };

describe('UI contract metadata', () => {
  it('keeps the package version inside its declared compatibility range', () => {
    expect(satisfies(packageJson.version, UI_PLUGIN_SDK_RANGE)).toBe(true);
  });

  it('accepts a compatible registry and remote declaration', () => {
    const result = evaluateUICompatibility({ registry: v1, remote: v1 });
    expect(result.status).toBe('compatible');
  });

  it('preserves legacy absence without inventing a declaration', () => {
    const result = evaluateUICompatibility({});
    expect(result.status).toBe('legacy');
    expect(result.reason).toBe('legacy');
    expect(result.actual.registry).toBeUndefined();
    expect(result.actual.remote).toBeUndefined();
  });

  it('requires both declarations when enforcement is enabled', () => {
    expect(evaluateUICompatibility({ requireContracts: true }).reason).toBe('contract_required');
    expect(evaluateUICompatibility({ registry: v1, requireContracts: true }).reason).toBe('contract_required');
    expect(evaluateUICompatibility({ remote: v1, requireContracts: true }).reason).toBe('contract_required');
  });

  it('rejects unsupported host APIs and future major-only remotes', () => {
    const future = { hostApi: 'inari.ui.v2', sdk: UI_PLUGIN_SDK_RANGE };
    const result = evaluateUICompatibility({ remote: future });
    expect(result.status).toBe('incompatible');
    expect(result.reason).toBe('contract_unsupported');
    expect(result.required.hostApis).toContain(UI_HOST_API_V1);
  });

  it('rejects unsupported or malformed SDK ranges', () => {
    expect(evaluateUICompatibility({ remote: { ...v1, sdk: '>=2.0.0' } }).reason).toBe('contract_unsupported');
    expect(evaluateUICompatibility({ remote: { ...v1, sdk: 'not-a-range' } }).reason).toBe('contract_malformed');
  });

  it('rejects registry/remote declaration mismatch', () => {
    expect(evaluateUICompatibility({ registry: v1, remote: { ...v1, hostApi: 'inari.ui.v2' } }).reason).toBe('declaration_mismatch');
    expect(evaluateUICompatibility({ registry: v1, remote: { ...v1, sdk: '>=2.0.0' } }).reason).toBe('declaration_mismatch');
  });

  it('supports v1 additive ranges and future v1+v2 overlap', () => {
    expect(evaluateUICompatibility({ registry: v1, remote: { ...v1, sdk: '^0.1.8' } }).status).toBe('compatible');
    const future = { ...v1, hostApi: 'inari.ui.v2' };
    expect(evaluateUICompatibility({ registry: future, remote: future, supportedHostApis: ['inari.ui.v1', 'inari.ui.v2'] }).status).toBe('compatible');
  });
});
