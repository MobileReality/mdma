/**
 * Design tokens for the RN renderer. This is the React Native answer to
 * `renderer-react`'s `styles.css`: instead of `.mdma-*` classes, every
 * renderer reads these tokens and builds `StyleSheet` values from them.
 *
 * The light/dark palettes are kept **identical** to the web renderer's built-in
 * themes (`renderer-react`'s `lightTheme`/`darkTheme`) so MDMA content looks the
 * same across web and native. Keep the two in sync when either changes.
 *
 * This module is intentionally free of any `react-native` import so the pure
 * token values stay usable (and unit-testable) without an RN runtime.
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
