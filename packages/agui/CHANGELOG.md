# @mobile-reality/mdma-agui

## 0.3.0

### Minor Changes

- 16fe1f2: Surface agentic activity — tool calls, run steps, and reasoning streams — as an ordered feed via the
  `onActivity` option and `bridge.activity` (also returned from `useMdmaAgentStream`). Activity is
  deliberately kept **out** of the MDMA document store, so agent chatter and rendered components stay
  decoupled: render it as a timeline beside the documents, or ignore it entirely. Each `MdmaActivity`
  carries a stable `id` (tool-call id / step handle / reasoning message id), a `kind`
  (`'tool' | 'step' | 'reasoning'`), a `label`, a `status` (`'running' | 'done'`), and streamed
  `detail` — accumulating tool args, the tool result, or the reasoning text.
- 16fe1f2: Accept MDMA on a dedicated `CUSTOM` event channel alongside inline assistant text. A backend that
  would rather not interleave documents into visible prose can emit
  `{ type: 'CUSTOM', name: 'mdma', value }` (the name is exported as `MDMA_CUSTOM_EVENT_NAME`), where
  `value` is either the markdown string or `{ messageId?, markdown }`. Both channels feed the same
  parse/store/render pipeline — out-of-band text is parsed immediately rather than throttled, since it
  arrives complete — and each message reports where it came from via `message.source`
  (`'text' | 'custom'`). Keeping documents off the prose channel means no markup leaks into the chat,
  which is what a tool-calling agent wants when the document lives in a tool argument.
- 16fe1f2: Resume parked runs through AG-UI's native `interrupt` primitive. When a run finishes with an
  `interrupt` outcome the bridge exposes the pending set as `bridge.interrupts` and fires
  `onInterrupt`; answering the component an interrupt refers to now resolves **that** interrupt with
  `runAgent({ resume })`, so the parked run continues with its state intact instead of starting a
  fresh turn.

  The new `resumeMode` option selects the strategy:

  - `'auto'` (default) — resolve a matching interrupt if the run is parked on one, otherwise fall back
    to a fresh user turn.
  - `'interrupt'` — only ever resolve a matching interrupt; if none matches, do nothing.
  - `'user-turn'` — always open a fresh user turn (`addMessage` + `runAgent`).

  **Behavior change:** a user decision previously always opened a fresh user turn. Under the new
  `'auto'` default it will resolve a matching interrupt when the run is parked on one. Pass
  `resumeMode: 'user-turn'` to keep the previous behavior. Returning `false` from `onAction`, or
  supplying `resume`, still overrides resumption entirely.

- 16fe1f2: Track the agent's shared state (`STATE_SNAPSHOT` / `STATE_DELTA`, including JSON-patch deltas) as a
  `componentId → values` map, exposed via the `onState` option and `bridge.state`, and use it to
  hydrate MDMA stores. MDMA components are headless — a document describes intent and takes its values
  from state — so this is what lets a form the agent renders come up **pre-filled** from what it
  already knows.

  Hydration is **reactive**: state arriving _after_ a component is already on screen is dispatched into
  that live store too, so the agent can set a field the user is currently looking at without
  re-rendering the component.

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
