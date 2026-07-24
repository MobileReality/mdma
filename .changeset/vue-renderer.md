---
'@mobile-reality/mdma-renderer-vue': minor
---

Add `@mobile-reality/mdma-renderer-vue`, a Vue 3 renderer for MDMA documents.

It turns a parsed MDMA document into interactive Vue 3 components — forms, tables, charts,
approval gates, and the rest of the component catalog — with full state, bindings, actions,
policy, audit, and PII redaction, all from the headless `spec` + `runtime` stack. Give
`MdmaDocument` an AST and a document store and it renders the live UI and dispatches user
interactions back into the store.

- **State via composables.** `useComponentState`, `useBinding`, and `useDocumentState` return
  `ComputedRef`s, so reads stay reactive.
- **provide/inject wiring.** `MdmaProvider`, `MdmaThemeProvider`, element overrides, and custom
  variants are supplied through Vue's provide/inject with exported `InjectionKey`s.
- **Themeable.** Ships `styles.css` driven by `--mdma-*` variables; pass a `theme` prop
  (`"light" | "dark" | "auto"`, or a full `MdmaTheme`) to `MdmaDocument`.
- **Customizable.** Override any built-in component via `customizations.components`, or draw a
  host-registered `custom` block via `customizations.customVariants`; custom renderers spread the
  exported `blockRendererProps` declaration.

Components are authored as `defineComponent` + `h()` in plain `.ts` — no `.vue` SFCs — so the
package builds with `tsc` and needs no bundler.
