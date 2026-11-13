import { describe, expect, it } from 'vitest';
import { extensionContainerName } from './remote-name';

describe('extensionContainerName', () => {
  it('preserves the host webpack global normalization', () => {
    expect(extensionContainerName('inari-ext-argocd')).toBe('inari_ext_argocd');
    expect(extensionContainerName('plain')).toBe('plain');
    expect(extensionContainerName('team.example/extension name')).toBe('team_example_extension_name');
    expect(extensionContainerName('valid_$Name09')).toBe('valid_$Name09');
  });

  it('rejects an empty registry name', () => {
    expect(() => extensionContainerName('')).toThrow('extension name is required');
  });
});
