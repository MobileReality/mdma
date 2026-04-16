# @mobile-reality/mdma-mcp

## 0.2.5

### Patch Changes

- 4f4f0b1: Add `list-docs` and `get-doc` tools to the MCP server so agents can fetch the latest MDMA docs directly from the public GitHub repo (`raw.githubusercontent.com/MobileReality/mdma`) instead of relying on whatever snapshot is bundled with the package. `list-docs` returns a curated catalog (path, title, description). `get-doc` fetches a doc by path, accepts an optional `ref` (branch/tag/SHA, defaults to `main`), and rejects path traversal.
- 1474271: Add `mcpName` field for publication to the official MCP Registry (https://registry.modelcontextprotocol.io). Server is registered as `io.github.MobileReality/mdma` (the registry namespace is case-sensitive and must match the GitHub org's canonical capitalization).
