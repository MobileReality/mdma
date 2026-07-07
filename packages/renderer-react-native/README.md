# @mobile-reality/mdma-renderer-react-native

React Native renderer for [MDMA](https://github.com/MobileReality/mdma) documents — the native
sibling of [`@mobile-reality/mdma-renderer-react`](../renderer-react). Renders all 9 MDMA
component types plus inline Markdown as native iOS/Android UI.

It reuses MDMA's headless stack unchanged — `spec`, `parser`, `runtime`, and (registered at the
app layer) `attachables-core` — and reimplements only the view layer with React Native
primitives. The document store, binding graph, policy, audit log, PII redaction, and streaming
state-preservation all come from `runtime`; each RN view emits the same store actions its web
counterpart does.

> Status: **v1 in progress** (M1 — reuse + core components). See
> [`mdma-renderer-react-native-plan.md`](../../mdma-renderer-react-native-plan.md) for scope,
> open questions, and milestones.

## Install

```sh
npm install @mobile-reality/mdma-renderer-react-native \
  @mobile-reality/mdma-spec @mobile-reality/mdma-runtime react react-native
```

The base package has **no native-module dependencies** — it installs cleanly into any RN app.
`select` renders as an inline option list, `date` as a text field, `file` as a placeholder;
richer native pickers are opt-in via `customizations` (see the plan, Q3/Q7).

## Usage

```tsx
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react-native';

// `ast` comes from @mobile-reality/mdma-parser; `store` is created from it.
function Screen({ ast, store }) {
  return (
    <ScrollView>
      <MdmaDocument ast={ast} store={store} theme="dark" />
    </ScrollView>
  );
}
```

### Theming

`MdmaDocument` wraps its children in an `MdmaThemeProvider`. Pass `theme="light" | "dark"` or a
full `MdmaTheme` token object. Renderers read tokens via `useMdmaTheme()`.

### Customizations

Override any component with your own RN renderer:

```tsx
<MdmaDocument
  ast={ast}
  store={store}
  customizations={{
    components: { chart: MyVictoryChartRenderer },
    dataSources: { countries: [{ label: 'Poland', value: 'PL' }] },
  }}
/>
```

Custom component types also need a Zod schema registered with the parser via `customSchemas`.

## What's shared vs. reimplemented

| Shared (headless, verbatim) | Reimplemented (RN view layer) |
|---|---|
| `createDocumentStore`, reducer, bindings | 9 component renderers (RN primitives) |
| policy, audit log, PII redaction | inline Markdown → RN `Text`/`View` |
| streaming `updateAst` state preservation | `StyleSheet`-based theming (no CSS) |
| `useBinding` / `useComponentState` hooks | a11y props (parallel to web's ARIA) |
