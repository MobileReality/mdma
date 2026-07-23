# Notes — renderer-vue

Scratch reasoning for the final explainer. Append only: never edit or remove an earlier
block, even one that turned out wrong — add a later block correcting it instead.
Deleted in the explainer commit.

## 1 — Scaffold package (a793535)

- Why: the package stays on the workspace's plain `tsc` toolchain, so it needs no build step of its own — `lib: ["ES2022", "DOM"]` is the only tsconfig deviation from `renderer-react`, which gets its DOM types transitively from `@types/react`.
- Instead of: `.vue` SFCs. They'd require `vue-tsc` plus a bundler, making this the only package in the repo that can't be built by `tsc -p` or linted by biome. `h()` render functions cost verbosity in `FormRenderer`/`MdastRenderer` and buy toolchain uniformity everywhere else.
- Surprise: the scaffold test is not ceremony — it's the only thing proving happy-dom + `@vue/test-utils` actually render, since every other package's tests are DOM-free.

## 2 — Port styles.css (86f9135)

- Why: copied byte-for-byte from `renderer-react` rather than trimmed or restyled, because the promise is theme portability — the same `MdmaTheme` object must render identically through either renderer.
- Instead of: depending on `@mobile-reality/mdma-renderer-react` for its stylesheet, which would make a Vue app install React to get a CSS file.
- Surprise: the duplication is load-bearing, so it's guarded by a test that diffs the two files. Editing one alone fails the Vue suite — that's the intended tripwire, not a nuisance.

## 3 — Theme module (b13789f)

- Why: `useMdmaTheme()` returns a `ComputedRef`, not a plain object like the React version. A Vue composable that returned a snapshot would silently stop tracking when an ancestor's `theme` prop changes — parity of *names* matters less than parity of *behavior*.
- Instead of: providing the raw `MdmaTheme`. The injected value is the whole `ResolvedThemeProps` (data-theme + inline vars + tokens) so a nested `MdmaDocument` with no `theme` of its own can re-apply the ancestor's presentation to its own root — the same reason the React context holds the resolved props.
- Surprise: `resolveThemeProps` derives `data-theme` from a custom theme's *background luminance*. That's not decoration — the stylesheet has internal derived vars (heading text, code backgrounds) outside the public token type, and picking the wrong base renders dark-on-dark.

## 4 — MdmaProvider (bca084b)

- Why: the provider renders its slot with no wrapper element, matching React's "return children" shape — a stray `<div>` here would break document layout for anyone nesting it.
- Instead of: providing a plain object. A `computed` is provided so swapping the `store` prop (which the AG-UI bridge does on re-parse) propagates to renderers instead of freezing the first store.
- Surprise: tests parse real markdown through `unified + remarkMdma` and seed the store with core attachables, rather than hand-building an AST. Hand-built fixtures drift from what the parser actually emits, and component state only exists because attachables create it.

## 5 — Element override + custom variant contexts (80a52aa)

- Why: `useElementOverride` returns a `ComputedRef`, not a component. Renderers resolve their overrides once in `setup`, so a plain value would pin the first `customizations` map forever; the computed keeps a live document customizable.
- Instead of: one context holding both overrides and variants. They're kept separate because `MdmaDocument` splits a single user-facing `components` map into them, and merging would leak that internal split into the public API.
- Surprise: the resolution chain (`scope` → `'*'` → built-in) is the whole feature and it's three lines — the tests are longer than the code on purpose, since getting the precedence backwards is silent and only shows up as the wrong widget.

## 6 — Store composables (7d0a771)

- Why: the store mutates its state in place and notifies via `subscribe`, so there is nothing for Vue to track. A `tick` counter bumped in the subscription is the bridge — every composable reads it to mean "recompute when the document changes".
- Instead of: `reactive(store)`. The provider now `toRaw`s the store on the way in: it's an external mutable service, and letting Vue proxy it breaks identity comparisons and instruments its internal `Map` on every read.
- Surprise: `useDocumentState` deliberately returns a *fresh* shallow wrapper per tick. Handing back `getState()` directly would be identity-stable, and Vue 3.4+ computeds skip effects when the value is `===` — the React version gets away with it only because renderers actually bind to `useComponentState`, which does mint new snapshots.
- Surprise: parsing fixtures through the real parser immediately failed with `onSubmit: Required` — a spec rule a hand-built AST fixture would have hidden. Three tests had been passing vacuously (no re-render at all) until it was fixed.

## 7 — Renderer props type + RendererRegistry class (e907218)

- Why: `blockRendererProps` exists because Vue needs a *runtime* prop declaration, not just a type. A renderer that skips it still receives the values — as DOM attributes on its root element, which is a silent, ugly failure mode. Exporting the declaration means third-party renderers can't get it wrong.
- Instead of: shipping `defaultRenderers` here as the React file does. It imports all ten renderers, none of which exist yet — the plan's rows 7/9/15 were re-scoped so the default map lands with the last renderer instead.

## 8 — MdastRenderer (d3a1c81)

- Why: raw `html` nodes render as *text*, never as markup — the React version's comment ("no dangerouslySetInnerHTML") is a security property, and the Vue port keeps it by never reaching for `v-html`. A test asserts a `<script>` payload stays inert.
- Instead of: mapping children with index keys as React does. Vue doesn't need keys for a statically-rendered tree, and index keys here would be noise.
- Surprise: the whole switch is exercised against markdown parsed by the real `remark-parse` + `remark-gfm`, so the tests pin the mdast shapes the parser actually emits (e.g. `listItem.checked` for task lists) rather than shapes assumed from the type definitions.

## 9 — MdmaBlockLoading (420d13c)

- Why: the type hint is a `computed` on the node prop, so a skeleton already on screen renames itself as more YAML streams in rather than waiting for the block to complete.

## 10 — FormRenderer (38bc0c5)

- Why: sub-elements keep React's `onChange` *callback prop* rather than becoming Vue emits. An override component can then either declare an `onChange` prop or `emits: ['change']` — both work — so the documented element-prop interfaces stay one shared contract across the React and Vue renderers.
- Instead of: `v-model`. The value lives in the store, not the component: every control reads `componentState.values` and writes through `dispatch`, so a two-way binding would introduce a second source of truth.
- Surprise: the mask toggle on a sensitive field is local `ref` state, deliberately never dispatched — whether a human is currently *looking* at a PII value is not document state and must not reach the audit log.
- Surprise: `mountBlock` (the test helper) is effectively `MdmaBlock` written a step early; when the real one lands at 15.1 it should look like this, which is a useful cross-check rather than duplication.

## 11 — Button + Callout renderers (f9d83f8)

- Why: dismissal goes through `dispatch` as document state rather than a local `ref`, so a dismissed callout stays dismissed when the document is re-parsed mid-stream. This is the mirror image of the form's mask toggle, which deliberately stays local.

## 12 — Tasklist + ApprovalGate renderers (9fd1102)

- Why: `onComplete` fires on the *transition* into all-checked, computed from the pre-dispatch snapshot plus the item just toggled — not from re-reading the store, which has already been mutated by the time the handler continues.
- Surprise: the approval gate's `approved` / `denied` status is never written by the renderer; it dispatches `APPROVAL_GRANTED` and the core attachable derives the status. The test asserts the rendered status flips, which is really a check that the renderer is reading state rather than inventing it.

## 13 — Table + Webhook renderers (PENDING)

- Why: table cells resolve bindings *per cell* as well as for the whole data set — a row value like `"{{user.name}}"` is resolved, anything else is passed through. That two-level resolution is easy to miss and is what makes bound rows work.
- Surprise: the webhook's `triggered` flag is local `ref` state, not document state, and it shadows the store-derived status in the label. It exists so a second click can't re-fire before a host has processed the first; the store still holds the authoritative status.
- Surprise: the spec requires `trigger` on a webhook (the action id that fires it) — another rule the real-parser fixtures caught.
