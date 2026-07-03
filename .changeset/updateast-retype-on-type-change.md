---
"@mobile-reality/mdma-runtime": patch
---

Fix `DocumentStore.updateAst` freezing a component's `type` for the lifetime of its id. During
streaming, an early partial parse can produce a placeholder/truncated type (e.g. `approval-gat`
before `approval-gate` finishes streaming); `updateAst` now re-initializes a component when its
type changes between parses, while still preserving in-flight state (values, touched) when the
type is unchanged.
