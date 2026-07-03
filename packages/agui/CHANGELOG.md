# @mobile-reality/mdma-agui

## 0.2.0

### Minor Changes

- b03ad21: Add an `initialState` option to `createDocumentStore` for hydrating component values at store
  creation — e.g. restoring a persisted conversation fetched from a backend. Keyed by component id →
  its `values` map (symmetric with `getState()`), it overlays AST defaults **without emitting audit
  events or marking fields `touched`**, and applies only to freshly-created components so a streaming
  re-parse never clobbers in-flight edits. `mdma-agui` threads `initialState` through `parseMdma`,
  the bridge, and `MdmaAgentView`/`useMdmaAgentStream`, so re-opened conversations render
  pre-populated.
- d90af8c: Add `@mobile-reality/mdma-agui`: a bridge that renders MDMA interactive documents streamed over
  the AG-UI protocol and routes user actions (submit / approve / deny) back into the agent run.
  Ships a headless core (`createMdmaAgentBridge`) plus an optional React layer
  (`useMdmaAgentStream`, `MdmaAgentView`). AG-UI coupling is isolated to a minimal structural agent
  interface, so any `@ag-ui/client` `HttpAgent` works without a hard dependency.
- b03ad21: Support tasklist completion and webhook triggers as routable events. The tasklist renderer now
  emits `ACTION_TRIGGERED` (its `onComplete` action) on the transition into all-items-checked, and
  the webhook renderer gains a trigger button that emits `INTEGRATION_CALLED`. The `mdma-agui`
  bridge routes both back into the agent run — alongside form submit, button, and approve/deny — so
  completing a checklist or firing a webhook resumes the AG-UI conversation.

### Patch Changes

- d262328: Stop flashing "Unknown component type" while a block is still streaming. When an `mdma` fence is
  not yet closed, a valid-YAML-but-unknown type (e.g. a half-streamed `approval-gat` before
  `approval-gate` finishes) is now left as a pending block (loading skeleton) instead of being
  rendered as an unknown-type error. Once the fence closes, a genuinely unknown type still surfaces
  the error as before. Known valid types continue to render live during streaming. The `mdma-agui`
  adapter now threads the source into `unified.run()` so the parser can see the raw fences.
