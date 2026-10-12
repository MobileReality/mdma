---
'@mobile-reality/mdma-prompt-pack': minor
'@mobile-reality/mdma-mcp': minor
'@mobile-reality/mdma-cli': minor
---

Teach the LLM authoring path about external data sources.

- `@mobile-reality/mdma-prompt-pack`: `buildSystemPrompt({ dataSources })` renders an "Available data sources" catalog (name, description, kind, columns, params) plus the rule to reference catalog data with `{ source, params }` in select `options`, `table.data` and `chart.data` instead of generating rows. The author spec block documents the `{ source, params }` form. Without `dataSources` the prompt is unchanged apart from that spec note.
- `@mobile-reality/mdma-mcp`: the `build-system-prompt` tool accepts `dataSources`; when given it returns the full system prompt including the catalog.
- `@mobile-reality/mdma-cli`: new `mdma prompt --data-sources <file>` prints the system prompt with a catalog, and `mdma validate --data-sources <file>` validates source refs against it.
