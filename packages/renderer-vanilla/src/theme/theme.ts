/**
 * Design tokens for the web renderers — the typed mirror of the `--mdma-*` CSS
 * custom properties in `styles.css`, and the same shape the React, Vue, and
 * React Native renderers expose, so a theme object is portable between them.
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
  dataTheme?: 'light' | 'dark' | 'auto';
  /** Inline CSS variables, when a custom theme object is provided. */
  style?: Record<string, string>;
  theme: MdmaTheme;
}

function camelToKebab(key: string): string {
  return key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/** Convert tokens into the inline CSS variables the `.mdma-*` classes read. */
export function themeToCssVars(theme: MdmaTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme.colors)) {
    vars[`--mdma-color-${camelToKebab(key)}`] = value;
  }
  for (const [key, value] of Object.entries(theme.spacing))
    vars[`--mdma-spacing-${key}`] = `${value}px`;
  for (const [key, value] of Object.entries(theme.radius))
    vars[`--mdma-radius-${key}`] = `${value}px`;
  for (const [key, value] of Object.entries(theme.fontSize)) {
    vars[`--mdma-font-size-${camelToKebab(key)}`] = `${value}px`;
  }
  return vars;
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

export function resolveThemeProps(theme: MdmaThemeInput | undefined): ResolvedThemeProps {
  if (theme === undefined) return { theme: lightTheme };
  if (theme === 'light') return { dataTheme: 'light', theme: lightTheme };
  if (theme === 'dark') return { dataTheme: 'dark', theme: darkTheme };
  // `auto` follows the OS preference at the CSS layer; the resolved token object
  // is a best-effort light default for any JS consumer.
  if (theme === 'auto') return { dataTheme: 'auto', theme: lightTheme };
  // A custom theme sets the public tokens inline, but the stylesheet also has
  // internal derived vars (heading text, code backgrounds, …) that aren't on the
  // public type. Pick the light/dark base by the theme's own background so those
  // derived vars match.
  return {
    dataTheme: isDarkTheme(theme) ? 'dark' : 'light',
    style: themeToCssVars(theme),
    theme,
  };
}

/** Apply a resolved theme to an element: `data-theme` plus any inline variables. */
export function applyTheme(element: HTMLElement, resolved: ResolvedThemeProps): void {
  if (resolved.dataTheme) element.setAttribute('data-theme', resolved.dataTheme);
  else element.removeAttribute('data-theme');

  for (const name of Array.from(element.style)) {
    if (name.startsWith('--mdma-')) element.style.removeProperty(name);
  }
  for (const [name, value] of Object.entries(resolved.style ?? {})) {
    element.style.setProperty(name, value);
  }
}
