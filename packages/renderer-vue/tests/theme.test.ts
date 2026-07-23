import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import {
  lightTheme,
  darkTheme,
  themeToCssVars,
  resolveThemeProps,
  MdmaThemeProvider,
  useMdmaTheme,
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
    expect((r.style as Record<string, string>)['--mdma-color-primary']).toBe('#ff0000');
    expect(r.theme).toBe(custom);
  });

  it('picks the light/dark base for a custom theme by its background, so internal vars match', () => {
    const lightCustom: MdmaTheme = { ...lightTheme };
    const darkCustom: MdmaTheme = { ...darkTheme };
    expect(resolveThemeProps(lightCustom).dataTheme).toBe('light');
    expect(resolveThemeProps(darkCustom).dataTheme).toBe('dark');
  });
});

describe('MdmaThemeProvider', () => {
  it('renders a themed root carrying data-theme', () => {
    const wrapper = mount(MdmaThemeProvider, {
      props: { theme: 'dark' },
      slots: { default: () => h('span', 'child') },
    });
    const root = wrapper.find('.mdma-theme-root');
    expect(root.attributes('data-theme')).toBe('dark');
    expect(root.text()).toBe('child');
  });

  it('writes custom theme tokens as inline CSS variables and merges extra styles', () => {
    const custom: MdmaTheme = { ...lightTheme, colors: { ...lightTheme.colors, primary: '#f0f' } };
    const wrapper = mount(MdmaThemeProvider, {
      props: { theme: custom, style: { margin: '4px' }, class: 'extra' },
    });
    const style = wrapper.find('.mdma-theme-root').attributes('style') ?? '';
    expect(style).toContain('--mdma-color-primary: #f0f');
    expect(style).toContain('margin: 4px');
    expect(wrapper.find('.mdma-theme-root').classes()).toContain('extra');
  });

  it('exposes the resolved tokens to descendants, and tracks a changing theme prop', async () => {
    const Probe = defineComponent({
      setup() {
        const theme = useMdmaTheme();
        return () => h('i', theme.value.colors.primary);
      },
    });
    const Host = defineComponent({
      setup() {
        const mode = ref<'light' | 'dark'>('light');
        // Exposed so the test can flip the ancestor theme after mount.
        return { mode };
      },
      render() {
        return h(MdmaThemeProvider, { theme: this.mode }, { default: () => h(Probe) });
      },
    });

    const wrapper = mount(Host);
    expect(wrapper.find('i').text()).toBe(lightTheme.colors.primary);

    wrapper.vm.mode = 'dark';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('i').text()).toBe(darkTheme.colors.primary);
  });

  it('falls back to the light tokens with no provider above', () => {
    const Probe = defineComponent({
      setup() {
        const theme = useMdmaTheme();
        return () => h('i', theme.value.colors.primary);
      },
    });
    expect(mount(Probe).find('i').text()).toBe(lightTheme.colors.primary);
  });
});
