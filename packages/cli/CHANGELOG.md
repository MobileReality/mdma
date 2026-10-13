# @mobile-reality/mdma-cli

## 0.3.0

### Minor Changes

- 0a07539: Bring the prompt builder's master prompts up to date with the current spec and author prompt.

  - `MASTER_PROMPT` and the Anthropic/Google variants document `{ source, params }` for table `data`, chart `data` and form select `options`, table `sortable` / `filterable` / `pageSize`, quoted numeric option values, and the standalone `custom` envelope.
  - New "External Data Sources" section: catalog entries are definitions without data, `rows` feeds `table.data`, `series` feeds `chart.data`, `options` feeds select `options`, and data needed as both a table and a chart uses two sources (`rows` and `series`). Generated prompts reference sources and never inline their data.
  - New rule that a generated prompt never shows two interactive components together; the KYC example now shows the approval gate and the tasklist in separate steps.
  - New `anthropic/sonnet-5.5` master prompt variant (`MASTER_PROMPT_SONNET_5_5`, selected for `claude-sonnet-5-5`) that describes `thinking` as a plan summary, because Sonnet 5.5 refuses system prompts that ask it to write out its reasoning. Other variants keep their wording.
  - `mdma prompt --data-sources` and `mdma validate --data-sources` describe the definitions file (`name`, `kind`, `columns`, `params`) in `--help`, and `createProgram()` now builds the commander program.

- 776cab5: Declare each external data source once and reuse it everywhere.

  - `@mobile-reality/mdma-spec`: new `DataSourceDefinition` (a `DataSourceDescriptor` plus optional `resolve`: static rows or an async resolver), the `defineDataSource()` identity helper, and the resolver types `DataSourceResolver`, `DataSourceRequest`, `DataSourceResult`, `DataSourceSort`.
  - `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` accepts `DataSourceDefinition[]` and ignores `resolve`.
  - `@mobile-reality/mdma-runtime`: `createDocumentStore(ast, { dataSources })` accepts the existing name-keyed map or a `DataSourceDefinition[]`; a definition without `resolve` errors with "no resolver registered" when referenced.
  - `@mobile-reality/mdma-validator`: `dataSourceCatalog` accepts the existing name-keyed record or a `DataSourceDefinition[]`.
  - Duplicate names in an array throw at the API boundary. `@mobile-reality/mdma-cli`: the `toCatalog` export is removed; pass the descriptor array straight to the validator.

- 6ec6eb1: Teach the LLM authoring path about external data sources.

  - `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` renders an "Available data sources" catalog (name, description, kind, columns, params) plus the rule to reference catalog data with `{ source, params }` in select `options`, `table.data` and `chart.data` instead of generating rows. The author spec block documents the `{ source, params }` form. Without `dataSources` the prompt is unchanged apart from that spec note.
  - `@mobile-reality/mdma-mcp`: the `build-system-prompt` tool accepts `dataSources`; when given it returns the full system prompt including the catalog.
  - `@mobile-reality/mdma-cli`: new `mdma prompt --data-sources <file>` prints the system prompt with a catalog, and `mdma validate --data-sources <file>` validates source refs against it.

### Patch Changes

- Updated dependencies [7fb5b2d]
- Updated dependencies [776cab5]
- Updated dependencies [6ec6eb1]
- Updated dependencies [85cfde8]
- Updated dependencies [a51f500]
  - @mobile-reality/mdma-prompt-pack@0.6.0
  - @mobile-reality/mdma-spec@0.5.0
  - @mobile-reality/mdma-validator@0.4.0

## 0.2.10

### Patch Changes

- Updated dependencies [cb3cf95]
  - @mobile-reality/mdma-spec@0.4.0
  - @mobile-reality/mdma-prompt-pack@0.5.0
  - @mobile-reality/mdma-validator@0.3.3

## 0.2.9

### Patch Changes

- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-spec@0.3.1
  - @mobile-reality/mdma-prompt-pack@0.4.1
  - @mobile-reality/mdma-validator@0.3.2

## 0.2.8

### Patch Changes

- @mobile-reality/mdma-validator@0.3.1

## 0.2.7

### Patch Changes

- Updated dependencies [4a04d6f]
  - @mobile-reality/mdma-prompt-pack@0.4.0

## 0.2.6

### Patch Changes

- 019778a: Tests update
- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-validator@0.3.0
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-prompt-pack@0.3.2

## 0.2.5

### Patch Changes

- Updated dependencies [d23b52c]
  - @mobile-reality/mdma-prompt-pack@0.3.1

## 0.2.4

### Patch Changes

- Updated dependencies [4b595c8]
  - @mobile-reality/mdma-prompt-pack@0.3.0

## 0.2.3

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-prompt-pack@0.2.2
  - @mobile-reality/mdma-validator@0.2.3
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.2

### Patch Changes

- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-prompt-pack@0.2.1
  - @mobile-reality/mdma-validator@0.2.2
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.1

### Patch Changes

- Updated dependencies
  - @mobile-reality/mdma-validator@0.2.1

## 0.1.5

### Patch Changes

- Updated dependencies [4d37c6d]
  - @mobile-reality/mdma-prompt-pack@1.0.0
  - @mobile-reality/mdma-validator@1.0.0

## 0.1.4

### Patch Changes

- Add form submit handling in preview tab, separate LLM config override for preview tab, and fix CSS override rendering
