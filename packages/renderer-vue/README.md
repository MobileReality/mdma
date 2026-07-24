# @mobile-reality/mdma-renderer-vue

Vue 3 renderer for [MDMA](https://github.com/MobileReality/mdma) documents — the Vue sibling of
[`@mobile-reality/mdma-renderer-react`](../renderer-react). Renders all 10 MDMA component types
plus inline Markdown, emitting the same `.mdma-*` class names and shipping the same
`styles.css`, so a theme is portable between the two renderers.

It reuses MDMA's headless stack unchanged — `spec`, `parser`, `runtime`, and (registered at the
app layer) `attachables-core` — and reimplements only the view layer. The document store,
binding graph, policy, audit log, PII redaction, and streaming state-preservation all come from
`runtime`; each Vue component emits the same store actions its React counterpart does.

## Install

```sh
npm install @mobile-reality/mdma-renderer-vue \
  @mobile-reality/mdma-spec @mobile-reality/mdma-runtime vue
```

## Usage

```ts
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-vue';
import '@mobile-reality/mdma-renderer-vue/styles.css';
```

```vue
<script setup lang="ts">
import { MdmaDocument } from '@mobile-reality/mdma-renderer-vue';

// `ast` comes from @mobile-reality/mdma-parser; `store` is created from it.
const props = defineProps<{ ast: MdmaRoot; store: DocumentStore }>();
</script>

<template>
  <MdmaDocument :ast="props.ast" :store="props.store" theme="dark" />
</template>
```

### Theming

Pass `theme="light" | "dark" | "auto"` (`"auto"` follows the OS color scheme) or a full
`MdmaTheme` token object; omit it for the default light palette. Built-in palettes are applied
as a `data-theme` attribute, a custom theme as inline `--mdma-*` CSS variables. To theme
components rendered outside a `MdmaDocument` (a lone `MdmaBlock`, say), wrap them in
`MdmaThemeProvider`.

The `MdmaTheme` token shape is shared with the React and React Native renderers, so a theme
object is portable across all three. See the repo [Theming guide](../../docs/guides/theming.md)
for the full token reference.

### Customizations

Override a whole component renderer, or just a sub-element inside one:

```ts
<MdmaDocument
  :ast="ast"
  :store="store"
  :customizations="{
    components: {
      chart: MyChartRenderer,                  // full renderer
      form: { elements: { input: GlassInput } }, // sub-element only
    },
    customVariants: { 'signature-pad': SignaturePad },
    dataSources: { countries: [{ label: 'Poland', value: 'PL' }] },
  }"
/>
```

Element overrides resolve scope-specific → global (`'*'`) → built-in. Custom component types
also need a Zod schema registered with the parser via `customSchemas`.

A custom renderer should spread the exported prop declaration so Vue passes the props through
rather than dropping them on the root element as attributes:

```ts
import { defineComponent, h } from 'vue';
import { blockRendererProps } from '@mobile-reality/mdma-renderer-vue';

export const MyChartRenderer = defineComponent({
  props: blockRendererProps,
  setup(props) {
    return () => h('div', props.component.id);
  },
});
```

## Differences from the React renderer

The public API mirrors `renderer-react` name for name (a test asserts every value export
exists here too), with these deliberate differences:

| | React | Vue |
|---|---|---|
| Composables | `useMdmaTheme()`, `useComponentState()` … return plain values | return `ComputedRef`s, so they stay reactive — read `.value` |
| Context | `createContext` / `useContext` | `provide` / `inject` with exported `InjectionKey`s |
| Renderer props | type-only `MdmaBlockRendererProps` | plus the runtime declaration `blockRendererProps` |
| Element overrides | components receive `onChange` props | same — an override may declare an `onChange` prop *or* `emits: ['change']` |
| Memoization | `memo` + `useCallback` | none needed; Vue caches renders itself |

Components are authored as `defineComponent` + `h()` render functions in plain `.ts` — no
`.vue` SFCs — so the package builds with the workspace's `tsc` and needs no bundler.

## What's shared vs. reimplemented

| Shared (headless, verbatim) | Reimplemented (Vue view layer) |
|---|---|
| `createDocumentStore`, reducer, bindings | 10 component renderers |
| policy, audit log, PII redaction | inline Markdown → vnodes |
| streaming `updateAst` state preservation | `styles.css` (mirrored from the web renderer) |
| binding resolution | store subscription → Vue reactivity bridge |

## License

Apache-2.0
