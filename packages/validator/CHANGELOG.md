# @mobile-reality/mdma-validator

## 0.4.0

### Minor Changes

- 776cab5: Declare each external data source once and reuse it everywhere.

  - `@mobile-reality/mdma-spec`: new `DataSourceDefinition` (a `DataSourceDescriptor` plus optional `resolve`: static rows or an async resolver), the `defineDataSource()` identity helper, and the resolver types `DataSourceResolver`, `DataSourceRequest`, `DataSourceResult`, `DataSourceSort`.
  - `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` accepts `DataSourceDefinition[]` and ignores `resolve`.
  - `@mobile-reality/mdma-runtime`: `createDocumentStore(ast, { dataSources })` accepts the existing name-keyed map or a `DataSourceDefinition[]`; a definition without `resolve` errors with "no resolver registered" when referenced.
  - `@mobile-reality/mdma-validator`: `dataSourceCatalog` accepts the existing name-keyed record or a `DataSourceDefinition[]`.
  - Duplicate names in an array throw at the API boundary. `@mobile-reality/mdma-cli`: the `toCatalog` export is removed; pass the descriptor array straight to the validator.

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
  - @mobile-reality/mdma-parser@0.3.1

## 0.3.3

### Patch Changes

- Updated dependencies [cb3cf95]
  - @mobile-reality/mdma-spec@0.4.0
  - @mobile-reality/mdma-parser@0.3.0

## 0.3.2

### Patch Changes

- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-spec@0.3.1
  - @mobile-reality/mdma-parser@0.2.5

## 0.3.1

### Patch Changes

- Updated dependencies [d262328]
  - @mobile-reality/mdma-parser@0.2.4

## 0.3.0

### Minor Changes

- 5bb8529: Split validator into per-block validate() and multi-message validateConversation(); make form.onSubmit required and rewrite action-label fields as opaque labels (drop the action-references rule); add many model-specific fixer/author/agent-tool prompt variants (gpt-5.x family, Claude opus/sonnet/haiku, Gemini 2.5/3, Grok), promote the conversation-judge prompt out of mdma-fixer/ and rename its export to MDMA_CONVERSATION_JUDGE.

### Patch Changes

- Updated dependencies [5bb8529]
- Updated dependencies [019778a]
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-parser@0.2.3

## 0.2.3

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-parser@0.2.2
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.2

### Patch Changes

- 9ba720a: Add `file` field type to forms. Forms can now declare file upload inputs, with a default file input UI in the renderer (overridable via `ElementOverridesContext`), schema defaults in the validator, and authoring guidance in the prompt pack.
- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-spec@0.2.1
  - @mobile-reality/mdma-parser@0.2.1

## 0.2.1

### Patch Changes

- Improved validator error messages and added new rules:

  - **Fuzzy type suggestions** — `schema-conformance` now suggests the closest match for unknown component types via Levenshtein distance and always lists valid types
  - **New `expected-components` rule** — verifies the LLM generated expected components with correct types, form fields, table columns, and action references (only checks components present in the message)
  - **Thinking block improvements** — detects duplicate thinking blocks, auto-fixes by merging multiples into one at the top; no longer warns when no thinking block is present
  - **Improved unfenced detection** — now requires both `type:` and nearby `id:` to flag bare MDMA YAML, reducing false positives on documentation text
  - **Better YAML parse error handling** — `binding-resolution` and `unreferenced-components` rules disabled by default (single-message-only checks that caused false positives in multi-turn flows)

## 0.2.0

### Major Changes

- 4d37c6d: Added validator to the project

### Patch Changes

- Updated dependencies [4d37c6d]
  - @mobile-reality/mdma-parser@1.0.0
