# @mobile-reality/mdma-renderer-react-native

## 0.2.1

### Patch Changes

- d55f0ab: Add `main`, `module`, and `react-native` entry fields (and a `default` export condition) alongside the existing `exports` map. These packages previously exposed only an `exports` map, so bundlers that don't opt into package `exports` resolution — notably Metro/Snackager (Expo Snack) — couldn't find an entry point and failed with "Can't resolve ''". The added fields make the packages resolvable in any React Native / Metro bundler without enabling `unstable_enablePackageExports`. Fully additive and backwards-compatible.
- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-runtime@0.3.1
  - @mobile-reality/mdma-spec@0.3.1

## 0.2.0

### Minor Changes

- f912866: Add `@mobile-reality/mdma-renderer-react-native` — a React Native renderer for MDMA documents,
  sibling to `@mobile-reality/mdma-renderer-react`. Renders all 9 component types plus inline
  Markdown as native iOS/Android UI, reusing the headless `spec`/`runtime` stack unchanged and
  reimplementing only the view layer with RN primitives. Includes `MdmaDocument`, per-component
  renderers, an `MdmaThemeProvider` with light/dark tokens, and `customizations` support.
