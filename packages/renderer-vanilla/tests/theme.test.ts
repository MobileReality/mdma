import { describe, expect, it } from 'vitest';
import {
  applyTheme,
  darkTheme,
  lightTheme,
  resolveThemeProps,
  themeToCssVars,
} from '../src/theme/theme.js';

describe('resolveThemeProps', () => {
  it('leaves the stylesheet default in place when no theme is given', () => {
    expect(resolveThemeProps(undefined)).toEqual({ theme: lightTheme });
  });

  it('maps the built-in palettes to a data-theme', () => {
    expect(resolveThemeProps('light')).toEqual({ dataTheme: 'light', theme: lightTheme });
    expect(resolveThemeProps('dark')).toEqual({ dataTheme: 'dark', theme: darkTheme });
    expect(resolveThemeProps('auto').dataTheme).toBe('auto');
  });

  it('writes a custom theme as inline variables', () => {
    const resolved = resolveThemeProps({
      ...lightTheme,
      colors: { ...lightTheme.colors, primary: '#ff0000' },
    });

    expect(resolved.style?.['--mdma-color-primary']).toBe('#ff0000');
    expect(resolved.dataTheme).toBe('light');
  });

  it('bases a dark custom theme on the dark derived variables', () => {
    const resolved = resolveThemeProps({
      ...darkTheme,
      colors: { ...darkTheme.colors, primary: '#00ff00' },
    });

    // Picked from the theme's own background, so derived tokens (heading text,
    // code backgrounds) don't come out light on a dark surface.
    expect(resolved.dataTheme).toBe('dark');
  });
});

describe('themeToCssVars', () => {
  it('kebab-cases token names and adds px to the numeric scales', () => {
    const vars = themeToCssVars(lightTheme);
    expect(vars['--mdma-color-on-primary']).toBe('#ffffff');
    expect(vars['--mdma-color-text-muted']).toBe('#666666');
    expect(vars['--mdma-spacing-lg']).toBe('16px');
    expect(vars['--mdma-radius-md']).toBe('10px');
    expect(vars['--mdma-font-size-title']).toBe('18px');
  });
});

describe('applyTheme', () => {
  it('sets data-theme and the inline variables', () => {
    const node = document.createElement('div');
    applyTheme(
      node,
      resolveThemeProps({ ...lightTheme, colors: { ...lightTheme.colors, primary: '#abcdef' } }),
    );

    expect(node.getAttribute('data-theme')).toBe('light');
    expect(node.style.getPropertyValue('--mdma-color-primary')).toBe('#abcdef');
  });

  it('clears previous variables when the theme is replaced', () => {
    const node = document.createElement('div');
    applyTheme(
      node,
      resolveThemeProps({ ...lightTheme, colors: { ...lightTheme.colors, primary: '#abcdef' } }),
    );
    applyTheme(node, resolveThemeProps('dark'));

    expect(node.getAttribute('data-theme')).toBe('dark');
    expect(node.style.getPropertyValue('--mdma-color-primary')).toBe('');
  });

  it('removes data-theme when the theme is dropped', () => {
    const node = document.createElement('div');
    applyTheme(node, resolveThemeProps('dark'));
    applyTheme(node, resolveThemeProps(undefined));

    expect(node.hasAttribute('data-theme')).toBe(false);
  });
});
