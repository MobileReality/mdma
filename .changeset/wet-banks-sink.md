---
"@mobile-reality/mdma-agui": patch
---

Bring the package README up to date with the bridge it ships. It still described the 0.2.x surface,
so 0.3.0 published with docs that were wrong in places: they claimed a user decision always resumes
via a fresh `addMessage` + `runAgent` turn (that is now only the fallback under the `'auto'`
`resumeMode`), and listed `createMdmaAgentBridge` as returning `{ documents, flush, dispose }` and
the hook as `{ documents, bridge }` — both omitting `activity`, `interrupts`, and `state`.

Also documents what 0.3.0 added but never explained: the `CUSTOM` delivery channel, shared state and
reactive hydration, the activity feed, and human-in-the-loop interrupts — plus the six missing
options (`initialState`, `onActivity`, `onState`, `onInterrupt`, `resumeMode`, `now`), the
`MDMA_CUSTOM_EVENT_NAME` / `createDefaultRegistry` exports, and the `INTEGRATION_CALLED` (webhook)
and tasklist-completion decisions. Fixes a sentence left truncated by a stale link removal.
