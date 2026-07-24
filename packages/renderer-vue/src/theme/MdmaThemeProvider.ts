import {
  computed,
  defineComponent,
  h,
  inject,
  provide,
  type ComputedRef,
  type CSSProperties,
  type InjectionKey,
  type PropType,
} from 'vue';

/**
 * Design tokens for the web renderer. This is the typed mirror of the CSS
 * custom properties in `styles.css`: the same token shape the React and React
 * Native renderers expose, so a theme object is portable between all three.
 *
 * You rarely need to read these tokens directly — the components are styled via
 * `.mdma-*` classes that read the matching `--mdma-*` CSS variables. A custom
 * theme just rewrites those variables (see {@link MdmaThemeProvider}).
 */
export interface MdmaTheme {
  colors: {
    background: string;
    surface: string;
    text: string;
    textMuted: string;
    border: string;
    primary: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    danger: string;
    onDanger: string;
    /** Callout variant accents + soft backgrounds. */
    info: string;
    infoBg: string;
    warning: string;
    warningBg: string;
    error: string;
    errorBg: string;
    success: string;
    successBg: string;
  };
  spacing: { xs: number; sm: number; md: number; lg: number };
  radius: { sm: number; md: number };
  fontSize: { small: number; body: number; label: number; title: number };
}

/** Built-in light palette — matches the default `--mdma-*` values in `styles.css`. */
export const lightTheme: MdmaTheme = {
  colors: {
    background: '#ffffff',
    surface: '#f8f9fa',
    text: '#333333',
    textMuted: '#666666',
    border: '#e0e0e0',
    primary: '#6c5ce7',
    onPrimary: '#ffffff',
    secondary: '#dfe6e9',
    onSecondary: '#2d3436',
    danger: '#e74c3c',
    onDanger: '#ffffff',
    info: '#3498db',
    infoBg: '#ebf5fb',
    warning: '#f39c12',
    warningBg: '#fef9e7',
    error: '#e74c3c',
    errorBg: '#fdedec',
    success: '#27ae60',
    successBg: '#eafaf1',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { sm: 6, md: 10 },
  fontSize: { small: 13, body: 14, label: 15, title: 18 },
};

/** Built-in dark palette — matches the `[data-theme='dark']` block in `styles.css`. */
export const darkTheme: MdmaTheme = {
  colors: {
    background: '#151a26',
    surface: '#1c2333',
    text: '#e5e7eb',
    textMuted: '#9ca3af',
    border: '#2a3140',
    primary: '#8b7ff0',
    onPrimary: '#ffffff',
    secondary: '#2a3140',
    onSecondary: '#e5e7eb',
    danger: '#ef4444',
    onDanger: '#ffffff',
    info: '#5dade2',
    infoBg: '#16283a',
    warning: '#f5b041',
    warningBg: '#2a2412',
    error: '#ef4444',
    errorBg: '#2a1717',
    success: '#2ecc71',
    successBg: '#12251a',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { sm: 6, md: 10 },
  fontSize: { small: 13, body: 14, label: 15, title: 18 },
};

/**
 * What can be passed as a `theme`:
 * - `'light'` / `'dark'` — the built-in palettes (applied via `data-theme`).
 * - `'auto'` — follows the OS `prefers-color-scheme`.
 * - a full {@link MdmaTheme} — custom tokens, written inline as CSS variables.
 * - `undefined` — no theme; the stylesheet's default (light) tokens apply.
 */
export type MdmaThemeInput = MdmaTheme | 'light' | 'dark' | 'auto';

export interface ResolvedThemeProps {
  /** `data-theme` attribute value, when a built-in palette is selected. */
  dataTheme?: 'light' | 'dark' | 'auto';
  /** Inline CSS variables, when a custom theme object is provided. */
  style?: CSSProperties;
  /** The resolved token object exposed via {@link useMdmaTheme}. */
  theme: MdmaTheme;
}

/**
 * Injection key for the nearest resolved theme. Holds the full
 * {@link ResolvedThemeProps} (not just the tokens) so a descendant
 * `MdmaDocument` with no `theme` prop of its own can inherit the ancestor's
 * `data-theme` / inline variables and re-apply them to its own root.
 */
export const MdmaThemeKey: InjectionKey<ComputedRef<ResolvedThemeProps>> = Symbol('mdma-theme');

/**
 * The nearest resolved theme props, or the unthemed light default. Internal —
 * `MdmaDocument` uses it to inherit an ancestor provider's theme.
 */
export function useResolvedTheme(): ComputedRef<ResolvedThemeProps> {
  return inject(
    MdmaThemeKey,
    computed(() => ({ theme: lightTheme })),
  );
}

/**
 * The resolved token object for the nearest theme (defaults to {@link lightTheme}).
 *
 * Unlike the React renderer's `useMdmaTheme`, this returns a `ComputedRef` so the
 * tokens stay reactive when an ancestor's `theme` prop changes — read it as
 * `theme.value` in `setup`, or unwrapped in a template.
 */
export function useMdmaTheme(): ComputedRef<MdmaTheme> {
  const resolved = useResolvedTheme();
  return computed(() => resolved.value.theme);
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Convert an {@link MdmaTheme} into the inline CSS-variable style object the
 * `.mdma-*` classes read. Numeric scales are emitted as `px`.
 */
export function themeToCssVars(theme: MdmaTheme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--mdma-color-${camelToKebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(theme.spacing)) {
    vars[`--mdma-spacing-${key}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(theme.radius)) {
    vars[`--mdma-radius-${key}`] = `${value}px`;
  }
  for (const [key, value] of Object.entries(theme.fontSize)) {
    vars[`--mdma-font-size-${camelToKebab(key)}`] = `${value}px`;
  }
  return vars as CSSProperties;
}

/**
 * Resolve a {@link MdmaThemeInput} into the DOM props that apply it: a
 * `data-theme` attribute for built-in palettes, or inline CSS variables for a
 * custom theme. Shared by {@link MdmaThemeProvider} and `MdmaDocument`.
 */
export function resolveThemeProps(theme: MdmaThemeInput | undefined): ResolvedThemeProps {
  if (theme === undefined) return { theme: lightTheme };
  if (theme === 'light') return { dataTheme: 'light', theme: lightTheme };
  if (theme === 'dark') return { dataTheme: 'dark', theme: darkTheme };
  // `auto` follows the OS preference at the CSS layer; the resolved token
  // object is a best-effort light default for any JS consumer of useMdmaTheme.
  if (theme === 'auto') return { dataTheme: 'auto', theme: lightTheme };
  // A custom theme sets the public tokens inline, but the stylesheet also has
  // internal derived vars (heading text, code backgrounds, …) that aren't on
  // the public type. Pick the light/dark base by the theme's own background so
  // those derived vars match — otherwise a custom *dark* theme would render,
  // e.g., near-black heading text on a dark surface.
  return {
    dataTheme: isDarkTheme(theme) ? 'dark' : 'light',
    style: themeToCssVars(theme),
    theme,
  };
}

/** Heuristic: is this theme's background dark? (relative luminance < 50%). */
function isDarkTheme(theme: MdmaTheme): boolean {
  const hex = theme.colors.background.replace('#', '');
  if (hex.length < 6) return false;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  if (Number.isNaN(r + g + b)) return false;
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
}

/**
 * Standalone theme wrapper for rendering MDMA components *without* `MdmaDocument`
 * (e.g. a lone `<MdmaBlock>`). Renders a `.mdma-theme-root` element carrying the
 * theme so the `--mdma-*` variables cascade to everything inside. When you use
 * `MdmaDocument`, pass `theme` to it directly instead — it themes its own root.
 */
export const MdmaThemeProvider = defineComponent({
  name: 'MdmaThemeProvider',
  props: {
    /** `'light'` | `'dark'` | `'auto'`, or a full {@link MdmaTheme}. */
    theme: { type: [String, Object] as PropType<MdmaThemeInput>, default: undefined },
    /** Extra class names for the wrapper element. */
    class: { type: String, default: undefined },
    /** Extra inline styles, merged after the theme's CSS variables. */
    style: { type: Object as PropType<CSSProperties>, default: undefined },
  },
  setup(props, { slots }) {
    const resolved = computed(() => resolveThemeProps(props.theme));
    provide(MdmaThemeKey, resolved);

    return () =>
      h(
        'div',
        {
          class: `mdma-theme-root ${props.class ?? ''}`.trim(),
          'data-theme': resolved.value.dataTheme,
          style: { ...resolved.value.style, ...props.style },
        },
        slots.default?.(),
      );
  },
});

export type MdmaThemeProviderProps = {
  theme?: MdmaThemeInput;
  class?: string;
  style?: CSSProperties;
};
