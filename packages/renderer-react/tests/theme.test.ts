import { describe, it, expect } from 'vitest';
import {
  lightTheme,
  darkTheme,
  themeToCssVars,
  resolveThemeProps,
  type MdmaTheme,
} from '../src/theme/MdmaThemeProvider.js';

// Structural parity guard: the light and dark palettes must expose exactly the
// same token shape so a class styled against one never reads an undefined
// variable under the other.
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

describe('themeToCssVars', () => {
  it('maps camelCase tokens to kebab-case --mdma-* variables', () => {
    const vars = themeToCssVars(lightTheme) as Record<string, string>;
    expect(vars['--mdma-color-primary']).toBe(lightTheme.colors.primary);
    expect(vars['--mdma-color-on-primary']).toBe(lightTheme.colors.onPrimary);
    expect(vars['--mdma-color-text-muted']).toBe(lightTheme.colors.textMuted);
    expect(vars['--mdma-color-info-bg']).toBe(lightTheme.colors.infoBg);
  });

  it('emits numeric scales with a px unit', () => {
    const vars = themeToCssVars(lightTheme) as Record<string, string>;
    expect(vars['--mdma-radius-md']).toBe(`${lightTheme.radius.md}px`);
    expect(vars['--mdma-spacing-lg']).toBe(`${lightTheme.spacing.lg}px`);
    expect(vars['--mdma-font-size-title']).toBe(`${lightTheme.fontSize.title}px`);
  });
});

describe('resolveThemeProps', () => {
  it('returns the light defaults with no data-theme when unset', () => {
    const r = resolveThemeProps(undefined);
    expect(r.dataTheme).toBeUndefined();
    expect(r.style).toBeUndefined();
    expect(r.theme).toBe(lightTheme);
  });

  it('applies built-in palettes via data-theme', () => {
    expect(resolveThemeProps('light')).toMatchObject({ dataTheme: 'light', theme: lightTheme });
    expect(resolveThemeProps('dark')).toMatchObject({ dataTheme: 'dark', theme: darkTheme });
    expect(resolveThemeProps('auto').dataTheme).toBe('auto');
  });

  it('writes a custom theme as inline CSS variables', () => {
    const custom: MdmaTheme = {
      ...lightTheme,
      colors: { ...lightTheme.colors, primary: '#ff0000' },
    };
    const r = resolveThemeProps(custom);
    expect(r.dataTheme).toBeUndefined();
    expect((r.style as Record<string, string>)['--mdma-color-primary']).toBe('#ff0000');
    expect(r.theme).toBe(custom);
  });
});
