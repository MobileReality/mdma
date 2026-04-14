---
"@mobile-reality/mdma-mcp": patch
---

Add `list-docs` and `get-doc` tools to the MCP server so agents can fetch the latest MDMA docs directly from the public GitHub repo (`raw.githubusercontent.com/MobileReality/mdma`) instead of relying on whatever snapshot is bundled with the package. `list-docs` returns a curated catalog (path, title, description). `get-doc` fetches a doc by path, accepts an optional `ref` (branch/tag/SHA, defaults to `main`), and rejects path traversal.
