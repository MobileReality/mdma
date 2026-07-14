---
'@mobile-reality/mdma-agui': minor
---

Surface agentic activity — tool calls, run steps, and reasoning streams — as an ordered feed via the
`onActivity` option and `bridge.activity` (also returned from `useMdmaAgentStream`). Activity is
deliberately kept **out** of the MDMA document store, so agent chatter and rendered components stay
decoupled: render it as a timeline beside the documents, or ignore it entirely. Each `MdmaActivity`
carries a stable `id` (tool-call id / step handle / reasoning message id), a `kind`
(`'tool' | 'step' | 'reasoning'`), a `label`, a `status` (`'running' | 'done'`), and streamed
`detail` — accumulating tool args, the tool result, or the reasoning text.
