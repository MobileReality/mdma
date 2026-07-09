import { createContext, useContext } from 'react';

/** Theme applied to the MDMA examples shown throughout the demo. */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * The web examples inherit the theme through `MdmaThemeProvider`, but the React
 * Native preview renders via the separate RN renderer (its own context), so it
 * reads the current mode from here instead.
 */
export const DemoThemeContext = createContext<ThemeMode>('light');

export function useDemoThemeMode(): ThemeMode {
  return useContext(DemoThemeContext);
}
