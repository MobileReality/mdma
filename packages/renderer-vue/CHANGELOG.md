# @mobile-reality/mdma-renderer-vue

## 0.3.0

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

- 17d5ef8: Masked table cells on a data source mask again when the rows change (page, sort, filter, reload) instead of carrying a reveal over to another record, and `filterable` source-backed tables render a filter input wired to `setDataFilter`.
- f91e22c: Export `DefaultDataLoading`, `DefaultDataError` and `DefaultDataEmpty`, matching the React renderer. `DefaultDataEmpty` accepts an optional `label`.
- Updated dependencies [776cab5]
- Updated dependencies [85cfde8]
  - @mobile-reality/mdma-spec@0.5.0
  - @mobile-reality/mdma-runtime@0.5.0

## 0.2.0

### Minor Changes

- 19977c0: Add `@mobile-reality/mdma-renderer-vue`, a Vue 3 renderer for MDMA documents.

  It turns a parsed MDMA document into interactive Vue 3 components — forms, tables, charts,
  approval gates, and the rest of the component catalog — with full state, bindings, actions,
  policy, audit, and PII redaction, all from the headless `spec` + `runtime` stack. Give
  `MdmaDocument` an AST and a document store and it renders the live UI and dispatches user
  interactions back into the store.

  - **State via composables.** `useComponentState`, `useBinding`, and `useDocumentState` return
    `ComputedRef`s, so reads stay reactive.
  - **provide/inject wiring.** `MdmaProvider`, `MdmaThemeProvider`, element overrides, and custom
    variants are supplied through Vue's provide/inject with exported `InjectionKey`s.
  - **Themeable.** Ships `styles.css` driven by `--mdma-*` variables; pass a `theme` prop
    (`"light" | "dark" | "auto"`, or a full `MdmaTheme`) to `MdmaDocument`.
  - **Customizable.** Override any built-in component via `customizations.components`, or draw a
    host-registered `custom` block via `customizations.customVariants`; custom renderers spread the
    exported `blockRendererProps` declaration.

  Components are authored as `defineComponent` + `h()` in plain `.ts` — no `.vue` SFCs — so the
  package builds with `tsc` and needs no bundler.
