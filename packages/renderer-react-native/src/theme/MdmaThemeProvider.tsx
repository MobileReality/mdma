import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { type MdmaTheme, lightTheme, darkTheme } from './tokens.js';

export { type MdmaTheme, lightTheme, darkTheme } from './tokens.js';

const MdmaThemeContext = createContext<MdmaTheme>(lightTheme);

export function useMdmaTheme(): MdmaTheme {
  return useContext(MdmaThemeContext);
}

export interface MdmaThemeProviderProps {
  /**
   * A full theme, or one of the built-in palettes:
   * - `'light'` / `'dark'` — the fixed built-in palettes.
   * - `'auto'` — follows the OS color scheme via `useColorScheme()`.
   */
  theme?: MdmaTheme | 'light' | 'dark' | 'auto';
  children: ReactNode;
}

export function MdmaThemeProvider({ theme = 'light', children }: MdmaThemeProviderProps) {
  const colorScheme = useColorScheme();
  const resolved = useMemo<MdmaTheme>(() => {
    if (theme === 'auto') return colorScheme === 'dark' ? darkTheme : lightTheme;
    if (theme === 'light') return lightTheme;
    if (theme === 'dark') return darkTheme;
    return theme;
  }, [theme, colorScheme]);

  return <MdmaThemeContext.Provider value={resolved}>{children}</MdmaThemeContext.Provider>;
}
