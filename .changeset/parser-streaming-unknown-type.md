---
"@mobile-reality/mdma-parser": patch
"@mobile-reality/mdma-agui": patch
---

Stop flashing "Unknown component type" while a block is still streaming. When an `mdma` fence is
not yet closed, a valid-YAML-but-unknown type (e.g. a half-streamed `approval-gat` before
`approval-gate` finishes) is now left as a pending block (loading skeleton) instead of being
rendered as an unknown-type error. Once the fence closes, a genuinely unknown type still surfaces
the error as before. Known valid types continue to render live during streaming. The `mdma-agui`
adapter now threads the source into `unified.run()` so the parser can see the raw fences.
