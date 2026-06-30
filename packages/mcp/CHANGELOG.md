# @mobile-reality/mdma-mcp

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
