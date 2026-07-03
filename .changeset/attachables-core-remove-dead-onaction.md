---
"@mobile-reality/mdma-attachables-core": patch
---

Remove the unused `onAction` methods from the core attachable handlers (form, button, tasklist,
table, callout, approval-gate, webhook). They were never invoked — renderers dispatch store actions
directly — so this is a dead-code cleanup with no behavioral change. Each handler's `definition` and
`initialize` are unchanged.
