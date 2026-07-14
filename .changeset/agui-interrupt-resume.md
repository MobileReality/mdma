---
'@mobile-reality/mdma-agui': minor
---

Resume parked runs through AG-UI's native `interrupt` primitive. When a run finishes with an
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
