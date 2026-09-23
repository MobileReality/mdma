---
'@mobile-reality/mdma-renderer-vanilla': minor
---

Add a framework-free renderer: `mountMdmaDocument` draws MDMA documents with plain DOM, covering all
ten core component types, Markdown, theming, element overrides, and custom variants. It shares
`styles.css` byte-for-byte with the React and Vue renderers, and preserves focus and in-progress
form values across the re-parses a streamed reply produces.
