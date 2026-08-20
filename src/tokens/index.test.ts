import { describe, expect, it } from 'vitest';
import { tokens } from './index';

describe('tokens', () => {
  it('exposes light and dark palettes', () => {
    expect(tokens.color.primary).toMatch(/^#/);
    expect(tokens.color.dark.background).toMatch(/^#/);
  });
});
