---
'@mobile-reality/mdma-spec': minor
'@mobile-reality/mdma-runtime': minor
'@mobile-reality/mdma-renderer-react': minor
'@mobile-reality/mdma-renderer-vue': minor
'@mobile-reality/mdma-renderer-vanilla': minor
'@mobile-reality/mdma-renderer-react-native': minor
'@mobile-reality/mdma-validator': minor
'@mobile-reality/mdma-prompt-pack': minor
'@mobile-reality/mdma-mcp': patch
---

Add `searchable: true` for form `select` fields. The field renders a type-to-search combobox in every renderer (overridable as the `combobox` form element in React, Vue and vanilla): inline options are filtered locally, and an options data source receives the typed text as `request.filter` (debounced), so large catalogs can be searched server-side. The runtime keeps a searchable select's value when a later search no longer returns it, the validator warns when `searchable` is set on a non-select field, the author and fixer prompts describe the flag, and the MCP spec lists it among the data-source rules.
