import { describe, it, expect } from 'vitest';
import { lightTheme, darkTheme, type MdmaTheme } from '../src/theme/MdmaThemeProvider.js';

// Structural parity guard: the light and dark palettes must expose exactly the
// same token shape, so a renderer styled against one never hits an undefined
// token under the other. (Component render tests need a RN test environment —
// see the renderer plan, deliverable "Tests".)
function keyShape(theme: MdmaTheme) {
  return {
    colors: Object.keys(theme.colors).sort(),
    spacing: Object.keys(theme.spacing).sort(),
    radius: Object.keys(theme.radius).sort(),
    fontSize: Object.keys(theme.fontSize).sort(),
  };
}

describe('MdmaTheme tokens', () => {
  it('light and dark themes share the same token shape', () => {
    expect(keyShape(lightTheme)).toEqual(keyShape(darkTheme));
  });

  it('every color token is a defined string in both themes', () => {
    for (const theme of [lightTheme, darkTheme]) {
      for (const value of Object.values(theme.colors)) {
        expect(typeof value).toBe('string');
        expect(value.length).toBeGreaterThan(0);
      }
    }
  });
});
