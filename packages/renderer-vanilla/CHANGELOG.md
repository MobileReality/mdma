# @mobile-reality/mdma-renderer-vanilla

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
- Updated dependencies [776cab5]
- Updated dependencies [85cfde8]
  - @mobile-reality/mdma-spec@0.5.0
  - @mobile-reality/mdma-runtime@0.5.0

## 0.2.0

### Minor Changes

- f280bc0: Add a framework-free renderer: `mountMdmaDocument` draws MDMA documents with plain DOM, covering all
  ten core component types, Markdown, theming, element overrides, and custom variants. It shares
  `styles.css` byte-for-byte with the React and Vue renderers, and preserves focus and in-progress
  form values across the re-parses a streamed reply produces.
