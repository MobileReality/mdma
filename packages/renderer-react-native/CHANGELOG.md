# @mobile-reality/mdma-renderer-react-native

## 0.2.0

### Minor Changes

- f912866: Add `@mobile-reality/mdma-renderer-react-native` — a React Native renderer for MDMA documents,
  sibling to `@mobile-reality/mdma-renderer-react`. Renders all 9 component types plus inline
  Markdown as native iOS/Android UI, reusing the headless `spec`/`runtime` stack unchanged and
  reimplementing only the view layer with RN primitives. Includes `MdmaDocument`, per-component
  renderers, an `MdmaThemeProvider` with light/dark tokens, and `customizations` support.
