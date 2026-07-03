---
"@mobile-reality/mdma-runtime": minor
"@mobile-reality/mdma-agui": minor
---

Add an `initialState` option to `createDocumentStore` for hydrating component values at store
creation — e.g. restoring a persisted conversation fetched from a backend. Keyed by component id →
its `values` map (symmetric with `getState()`), it overlays AST defaults **without emitting audit
events or marking fields `touched`**, and applies only to freshly-created components so a streaming
re-parse never clobbers in-flight edits. `mdma-agui` threads `initialState` through `parseMdma`,
the bridge, and `MdmaAgentView`/`useMdmaAgentStream`, so re-opened conversations render
pre-populated.
