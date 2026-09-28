---
'@mobile-reality/mdma-spec': minor
'@mobile-reality/mdma-runtime': minor
'@mobile-reality/mdma-validator': minor
'@mobile-reality/mdma-renderer-react': minor
'@mobile-reality/mdma-renderer-vue': minor
'@mobile-reality/mdma-renderer-react-native': minor
'@mobile-reality/mdma-renderer-vanilla': minor
---

Add host-registered external data sources: form select options, `table.data`, and `chart.data`
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
