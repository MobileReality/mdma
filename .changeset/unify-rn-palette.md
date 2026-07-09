---
'@mobile-reality/mdma-renderer-react-native': minor
---

Unify the React Native renderer's built-in `lightTheme`/`darkTheme` palettes with the web renderer's, so MDMA content looks consistent across web and native. The native defaults were previously a blue-primary palette; they now match the web renderer's purple-primary light/dark themes exactly (same `colors`, and `fontSize` `small`/`title` aligned). Pass a custom `MdmaTheme` to `MdmaDocument`/`MdmaThemeProvider` to override.

Also fixes the RN `TableRenderer` and `ChartRenderer` (which renders as a table), whose bodies had no themed background (only the header did) — on a dark theme the rows showed through to whatever was behind them. They now fill their container with `colors.background` (header stays `colors.surface`), matching the web renderer and the other RN card renderers.
