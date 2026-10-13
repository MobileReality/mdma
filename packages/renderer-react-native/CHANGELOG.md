# @mobile-reality/mdma-renderer-react-native

## 0.4.0

### Minor Changes

- 85cfde8: Add host-registered external data sources: form select options, `table.data`, and `chart.data`
  can reference `{ source, params }` instead of literal rows, so an MDMA document can show
  large API-backed data without the LLM generating it.

  - `@mobile-reality/mdma-spec`: `DataSourceRefSchema` (`{ source, params? }`) accepted alongside
    the existing literal/binding forms; `DataSourceDescriptor` for a future source catalog.
  - `@mobile-reality/mdma-runtime`: `createDocumentStore(ast, { dataSources })` resolves static
    arrays or async resolvers, with per-slot `idle|loading|ready|error` state, pagination/sort/filter
    (server-side when the resolver supports it, in-memory fallback otherwise), abort + debounce on
    bound param changes, cache/dedupe, and `resolveAllData(store)` for server-side use.
  - `@mobile-reality/mdma-validator`: new `data-source` rule (syntax always; catalog-aware via
    `ValidatorOptions.dataSourceCatalog`); `select-options` now defers a string ref's validity to it.
  - All four renderers (React, Vue, React Native, vanilla DOM): loading/error-with-retry/empty
    states (overridable via each renderer's element-override system), table pagination/sort driven
    by runtime state, and chart data from a source. `customizations.dataSources` keeps working
    unchanged.

### Patch Changes

- Updated dependencies [776cab5]
- Updated dependencies [85cfde8]
  - @mobile-reality/mdma-spec@0.5.0
  - @mobile-reality/mdma-runtime@0.5.0

## 0.3.1

### Patch Changes

- Updated dependencies [cb3cf95]
  - @mobile-reality/mdma-spec@0.4.0
  - @mobile-reality/mdma-runtime@0.4.0

## 0.3.0

### Minor Changes

- ae32824: Add opt-in theming to both renderers via a `theme` prop on `MdmaDocument`.

  - Pass `"light"`, `"dark"`, `"auto"` (follows the OS preference), or a full `MdmaTheme` token object; omit it for the unchanged default light look.
  - Web renderer: `styles.css` is now driven by `--mdma-*` CSS variables, so themes apply via `data-theme`/inline variables and can be overridden directly in CSS. Exposes `MdmaThemeProvider`, `useMdmaTheme`, `lightTheme`, `darkTheme`, and helpers.
  - Web renderer: a `MdmaDocument` with no `theme` prop now inherits the theme from an ancestor `MdmaThemeProvider`, so one provider can theme a whole app; an explicit `theme` prop still wins.
  - Web renderer: a custom `MdmaTheme` object now also selects the light/dark base (by its `background` luminance) so the stylesheet's internal derived colors (heading text, code backgrounds, …) match — a custom _dark_ theme no longer renders near-black text on a dark surface.
  - Web renderer: interactive states — button hover (`--mdma-color-*-hover`) and the input focus ring — now derive from the base tokens via `color-mix`, so a custom `primary` gets a coherent matching hover/focus automatically instead of the built-in purple.
  - React Native renderer: `theme="auto"` now follows the OS color scheme via `useColorScheme()`.
  - Both renderers share the same `MdmaTheme` token shape, so a custom theme object is portable between web and native.

- ff4ca64: Unify the React Native renderer's built-in `lightTheme`/`darkTheme` palettes with the web renderer's, so MDMA content looks consistent across web and native. The native defaults were previously a blue-primary palette; they now match the web renderer's purple-primary light/dark themes exactly (same `colors`, and `fontSize` `small`/`title` aligned). Pass a custom `MdmaTheme` to `MdmaDocument`/`MdmaThemeProvider` to override.

  Also fixes the RN `TableRenderer` and `ChartRenderer` (which renders as a table), whose bodies had no themed background (only the header did) — on a dark theme the rows showed through to whatever was behind them. They now fill their container with `colors.background` (header stays `colors.surface`), matching the web renderer and the other RN card renderers.

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
