---
'@mobile-reality/mdma-agui': minor
---

Accept MDMA on a dedicated `CUSTOM` event channel alongside inline assistant text. A backend that
would rather not interleave documents into visible prose can emit
`{ type: 'CUSTOM', name: 'mdma', value }` (the name is exported as `MDMA_CUSTOM_EVENT_NAME`), where
`value` is either the markdown string or `{ messageId?, markdown }`. Both channels feed the same
parse/store/render pipeline — out-of-band text is parsed immediately rather than throttled, since it
arrives complete — and each message reports where it came from via `message.source`
(`'text' | 'custom'`). Keeping documents off the prose channel means no markup leaks into the chat,
which is what a tool-calling agent wants when the document lives in a tool argument.
