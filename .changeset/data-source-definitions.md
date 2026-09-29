---
'@mobile-reality/mdma-spec': minor
'@mobile-reality/mdma-prompt-pack': minor
'@mobile-reality/mdma-runtime': minor
'@mobile-reality/mdma-validator': minor
'@mobile-reality/mdma-cli': minor
---

Declare each external data source once and reuse it everywhere.

- `@mobile-reality/mdma-spec`: new `DataSourceDefinition` (a `DataSourceDescriptor` plus optional `resolve`: static rows or an async resolver), the `defineDataSource()` identity helper, and the resolver types `DataSourceResolver`, `DataSourceRequest`, `DataSourceResult`, `DataSourceSort`.
- `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` accepts `DataSourceDefinition[]` and ignores `resolve`.
- `@mobile-reality/mdma-runtime`: `createDocumentStore(ast, { dataSources })` accepts the existing name-keyed map or a `DataSourceDefinition[]`; a definition without `resolve` errors with "no resolver registered" when referenced.
- `@mobile-reality/mdma-validator`: `dataSourceCatalog` accepts the existing name-keyed record or a `DataSourceDefinition[]`.
- Duplicate names in an array throw at the API boundary. `@mobile-reality/mdma-cli`: the `toCatalog` export is removed; pass the descriptor array straight to the validator.
