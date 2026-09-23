# @mobile-reality/mdma-renderer-vanilla

Render MDMA documents with **no framework** — plain DOM, no React, no Vue, no build step required.
Same components, same `.mdma-*` class names, and the same `styles.css` as
[`renderer-react`](../renderer-react) and [`renderer-vue`](../renderer-vue), so a theme is portable
across all three.

Reach for this when the host has no framework: a static page, a `<script>` tag, a CMS template, a
web-component wrapper, or an app whose framework MDMA shouldn't dictate. If you already have React
or Vue, use those renderers — they'll be less code for you.

```sh
pnpm add @mobile-reality/mdma-renderer-vanilla
```

## Quick start

```ts
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { mountMdmaDocument } from '@mobile-reality/mdma-renderer-vanilla';
import '@mobile-reality/mdma-renderer-vanilla/styles.css';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});
const ast = await processor.run(processor.parse(markdown), markdown);

const registry = new AttachableRegistry();
registerAllCoreAttachables(registry);
const store = createDocumentStore(ast, { registry });

const doc = mountMdmaDocument(document.getElementById('app')!, { ast, store, theme: 'auto' });
```

`mountMdmaDocument` returns a handle:

```ts
doc.el;                      // the .mdma-document root
doc.update({ ast: next });   // feed a re-parse (see Streaming)
doc.destroy();               // unsubscribe from the store and detach
```

It subscribes to the store itself, so a dispatch from any component re-renders the document without
you wiring anything.

## Streaming

This is the part a framework normally does for you, and the reason this package is more than a pile
of `document.createElement` calls.

A streamed model reply re-parses on **every chunk**, so `update({ ast })` gets a brand-new AST many
times a second — while the user may already be typing into a form the document drew. There is no
virtual DOM here. Instead each renderer owns its element and is re-fed props, so it decides what to
touch:

- **Form inputs are updated in place**, and `setInputValue` refuses to write to a focused field —
  your half-typed value and caret position survive every re-parse.
- **Nodes are only moved when the order actually changed.** Re-appending a node that is already in
  position would detach it, and detaching blurs a focused input.
- **A block that has parsed once is kept.** Mid-stream a complete fence can briefly revert to a
  pending code node; without the cache the document would flicker back to a loading skeleton.
- **Blocks are keyed by id *and* type**, so a truncated type (`approval-gat` → `approval-gate`)
  re-mounts into the right renderer instead of updating the wrong one.
- **A `thinking` block streams its content live** rather than sitting behind a skeleton.

Components with nothing worth preserving simply rebuild; `tests/streaming.test.ts` pins all of it.

## Customization

```ts
mountMdmaDocument(container, {
  ast,
  store,
  theme: 'dark',
  customizations: {
    components: {
      chart: MyChartRenderer,                    // replace a built-in renderer
      form: { elements: { input: GlassInput } }, // or just one sub-element
    },
    customVariants: { 'graph-3d': Graph3D },     // draw `type: custom` blocks
    dataSources: { countries: [{ label: 'Poland', value: 'pl' }] },
  },
});
```

A renderer is a function returning an instance — no class, no lifecycle to learn:

```ts
import { el, type MdmaBlockRenderer } from '@mobile-reality/mdma-renderer-vanilla';

const MyChartRenderer: MdmaBlockRenderer = (initial) => {
  const root = el('div', { class: 'my-chart' });
  const instance = {
    el: root,
    update(props) { /* re-feed, mutate what changed */ },
    destroy() { /* optional cleanup */ },
  };
  return instance;
};
```

For the common case where nothing needs preserving, `stateless(props => element)` writes the
instance for you, and `withState(init, (props, state) => element)` keeps view state (a revealed PII
cell, a fired webhook) across rebuilds.

## Theming

Identical to the other web renderers: `theme` takes `'light' | 'dark' | 'auto'` or a full
`MdmaTheme` token object, applied as `data-theme` or inline `--mdma-*` variables. `styles.css` is
byte-identical to the React package's and a test enforces that, so the three renderers can never
drift apart visually.

## What's here

All ten core component types — `form`, `button`, `tasklist`, `table`, `callout`, `approval-gate`,
`webhook`, `chart`, `thinking`, `custom` — plus Markdown rendering, loading skeletons, element
overrides, and theming.

Two deliberate limits, matching the framework renderers: `chart` draws a table rather than a real
chart (override it with a charting library), and `webhook` routes the trigger rather than performing
the HTTP call.

Raw HTML in Markdown is rendered as **text**, never parsed into live markup — model output must not
become executable DOM.
