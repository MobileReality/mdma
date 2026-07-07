import { createContext, useContext, useMemo, type ReactNode } from 'react';

/**
 * Design tokens for the RN renderer. This is the React Native answer to
 * `renderer-react`'s `styles.css`: instead of `.mdma-*` classes, every
 * renderer reads these tokens and builds `StyleSheet` values from them.
 * The default light/dark palettes are chosen to visually track the web look.
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
    surface: '#f7f7f8',
    text: '#1a1a1a',
    textMuted: '#6b7280',
    border: '#e5e7eb',
    primary: '#2563eb',
    onPrimary: '#ffffff',
    secondary: '#e5e7eb',
    onSecondary: '#1a1a1a',
    danger: '#dc2626',
    onDanger: '#ffffff',
    info: '#2563eb',
    infoBg: '#eff6ff',
    warning: '#d97706',
    warningBg: '#fffbeb',
    error: '#dc2626',
    errorBg: '#fef2f2',
    success: '#16a34a',
    successBg: '#f0fdf4',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { sm: 6, md: 10 },
  fontSize: { small: 12, body: 14, label: 15, title: 17 },
};

export const darkTheme: MdmaTheme = {
  colors: {
    background: '#0b0f19',
    surface: '#151a26',
    text: '#f3f4f6',
    textMuted: '#9ca3af',
    border: '#2a3140',
    primary: '#3b82f6',
    onPrimary: '#ffffff',
    secondary: '#2a3140',
    onSecondary: '#f3f4f6',
    danger: '#ef4444',
    onDanger: '#ffffff',
    info: '#3b82f6',
    infoBg: '#172033',
    warning: '#f59e0b',
    warningBg: '#2a2312',
    error: '#ef4444',
    errorBg: '#2a1717',
    success: '#22c55e',
    successBg: '#12251a',
  },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16 },
  radius: { sm: 6, md: 10 },
  fontSize: { small: 12, body: 14, label: 15, title: 17 },
};

const MdmaThemeContext = createContext<MdmaTheme>(lightTheme);

export function useMdmaTheme(): MdmaTheme {
  return useContext(MdmaThemeContext);
}

export interface MdmaThemeProviderProps {
  /** A full theme, or `'light'` / `'dark'` for the built-in palettes. */
  theme?: MdmaTheme | 'light' | 'dark';
  children: ReactNode;
}

export function MdmaThemeProvider({ theme = 'light', children }: MdmaThemeProviderProps) {
  const resolved = useMemo<MdmaTheme>(() => {
    if (theme === 'light') return lightTheme;
    if (theme === 'dark') return darkTheme;
    return theme;
  }, [theme]);

  return <MdmaThemeContext.Provider value={resolved}>{children}</MdmaThemeContext.Provider>;
}
