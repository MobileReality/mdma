# @mobile-reality/mdma-mcp

## 0.3.1

### Patch Changes

- db88a16: Declare `zod` as a runtime dependency so a clean install no longer resolves zod 4 and `tools/list` works again.

## 0.3.0

### Minor Changes

- 6ec6eb1: Teach the LLM authoring path about external data sources.

  - `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` renders an "Available data sources" catalog (name, description, kind, columns, params) plus the rule to reference catalog data with `{ source, params }` in select `options`, `table.data` and `chart.data` instead of generating rows. The author spec block documents the `{ source, params }` form. Without `dataSources` the prompt is unchanged apart from that spec note.
  - `@mobile-reality/mdma-mcp`: the `build-system-prompt` tool accepts `dataSources`; when given it returns the full system prompt including the catalog.
  - `@mobile-reality/mdma-cli`: new `mdma prompt --data-sources <file>` prints the system prompt with a catalog, and `mdma validate --data-sources <file>` validates source refs against it.

- 0d38fd9: Bring the MCP server up to date with external data sources and the new author prompt variants. `get-spec` now returns a `dataSources` section (`{ source, params }` refs, the `DataSourceDescriptor` shape, and the `rows` / `series` / `options` kinds), `build-system-prompt` documents the catalog descriptor shape, `list-docs` includes the external data sources guide, and `list-packages` mentions data-source support in runtime, validator, prompt-pack, and the React renderer.

### Patch Changes

- Updated dependencies [7fb5b2d]
- Updated dependencies [776cab5]
- Updated dependencies [6ec6eb1]
- Updated dependencies [85cfde8]
- Updated dependencies [a51f500]
  - @mobile-reality/mdma-prompt-pack@0.6.0
  - @mobile-reality/mdma-spec@0.5.0

## 0.2.14

### Patch Changes

- d0e2ce4: Component Catalog doc description now says 10 built-in component types, matching the spec.

## 0.2.13

### Patch Changes

- Updated dependencies [cb3cf95]
  - @mobile-reality/mdma-spec@0.4.0
  - @mobile-reality/mdma-prompt-pack@0.5.0

## 0.2.12

### Patch Changes

- Updated dependencies [d55f0ab]
  - @mobile-reality/mdma-spec@0.3.1
  - @mobile-reality/mdma-prompt-pack@0.4.1

## 0.2.11

### Patch Changes

- Updated dependencies [4a04d6f]
  - @mobile-reality/mdma-prompt-pack@0.4.0

## 0.2.10

### Patch Changes

- Updated dependencies [5bb8529]
  - @mobile-reality/mdma-spec@0.3.0
  - @mobile-reality/mdma-prompt-pack@0.3.2

## 0.2.9

### Patch Changes

- Updated dependencies [d23b52c]
  - @mobile-reality/mdma-prompt-pack@0.3.1

## 0.2.8

### Patch Changes

- d22b408: Expose model-optimised MDMA_AUTHOR prompt variants via MCP: new list-prompt-variants tool and optional variantId parameter on get-prompt.

## 0.2.7

### Patch Changes

- Updated dependencies [4b595c8]
  - @mobile-reality/mdma-prompt-pack@0.3.0

## 0.2.6

### Patch Changes

- d972139: Add npm keywords for discoverability
- Updated dependencies [d972139]
  - @mobile-reality/mdma-prompt-pack@0.2.2
  - @mobile-reality/mdma-spec@0.2.2

## 0.2.5

### Patch Changes

- Updated dependencies [9ba720a]
  - @mobile-reality/mdma-prompt-pack@0.2.1
  - @mobile-reality/mdma-spec@0.2.1

## 0.2.4

### Patch Changes

- 4f4f0b1: Add `list-docs` and `get-doc` tools to the MCP server so agents can fetch the latest MDMA docs directly from the public GitHub repo (`raw.githubusercontent.com/MobileReality/mdma`) instead of relying on whatever snapshot is bundled with the package. `list-docs` returns a curated catalog (path, title, description). `get-doc` fetches a doc by path, accepts an optional `ref` (branch/tag/SHA, defaults to `main`), and rejects path traversal.
- 1474271: Add `mcpName` field for publication to the official MCP Registry (https://registry.modelcontextprotocol.io). Server is registered as `io.github.MobileReality/mdma` (the registry namespace is case-sensitive and must match the GitHub org's canonical capitalization).
