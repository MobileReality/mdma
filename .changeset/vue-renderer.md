---
'@mobile-reality/mdma-renderer-vue': minor
---

Add `@mobile-reality/mdma-renderer-vue`, a Vue 3 renderer for MDMA documents.

It mirrors `@mobile-reality/mdma-renderer-react` name for name — `MdmaDocument`, `MdmaBlock`,
`MdmaProvider`, the theme module, element overrides, custom variants, the renderer registry, and
built-in renderers for all 10 component types — and ships the same `styles.css`, so a theme
object and a set of `.mdma-*` styles are portable between the two web renderers.

Vue-idiom differences: composables (`useMdmaTheme`, `useDocumentState`, `useComponentState`,
`useBinding`, `useElementOverride`) return `ComputedRef`s so they stay reactive; contexts use
`provide`/`inject`; and a runtime prop declaration, `blockRendererProps`, is exported for
authoring custom renderers.

Components are authored as `defineComponent` + `h()` in plain `.ts` — no `.vue` SFCs — so the
package builds with `tsc` and needs no bundler.
