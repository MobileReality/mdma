---
'@mobile-reality/mdma-mcp': minor
---

Bring the MCP server up to date with external data sources and the new author prompt variants. `get-spec` now returns a `dataSources` section (`{ source, params }` refs, the `DataSourceDescriptor` shape, and the `rows` / `series` / `options` kinds), `build-system-prompt` documents the catalog descriptor shape, `list-docs` includes the external data sources guide, and `list-packages` mentions data-source support in runtime, validator, prompt-pack, and the React renderer.
