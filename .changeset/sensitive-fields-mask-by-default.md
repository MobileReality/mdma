---
"@mobile-reality/mdma-renderer-react": patch
---

Fix sensitive form field masking in the default form renderer. Sensitive fields now start masked and
stay masked while typing (showing `•••`), instead of revealing the value as you type — the `👁`/`🔒`
toggle reveals it on demand. Also fixed the accompanying styles: masked inputs switch to
`type="password"`, which had no matching CSS rule and collapsed to an unstyled native box, and the
reveal/mask toggle button now sits as an overlay inside the input rather than wrapping onto its own
line below it.
