---
'@mobile-reality/mdma-renderer-react': minor
'@mobile-reality/mdma-renderer-react-native': minor
---

Add opt-in theming to both renderers via a `theme` prop on `MdmaDocument`.

- Pass `"light"`, `"dark"`, `"auto"` (follows the OS preference), or a full `MdmaTheme` token object; omit it for the unchanged default light look.
- Web renderer: `styles.css` is now driven by `--mdma-*` CSS variables, so themes apply via `data-theme`/inline variables and can be overridden directly in CSS. Exposes `MdmaThemeProvider`, `useMdmaTheme`, `lightTheme`, `darkTheme`, and helpers.
- Web renderer: a `MdmaDocument` with no `theme` prop now inherits the theme from an ancestor `MdmaThemeProvider`, so one provider can theme a whole app; an explicit `theme` prop still wins.
- React Native renderer: `theme="auto"` now follows the OS color scheme via `useColorScheme()`.
- Both renderers share the same `MdmaTheme` token shape, so a custom theme object is portable between web and native.
