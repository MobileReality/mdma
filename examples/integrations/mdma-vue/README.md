# MDMA × Vue — renderer example

A frontend-only Vue 3 app that parses one MDMA document and renders it with
[`@mobile-reality/mdma-renderer-vue`](../../../packages/renderer-vue). No backend, no agent —
the point is the renderer and the store it draws.

Where the [AG-UI example](../ag-ui) shows the full streamed-agent loop, this one is the minimal
"here is a document, draw it and let me interact with it" case:

- a **form** with a required email, a **sensitive** Tax ID (masked, click to reveal), and a
  **select** backed by a named data source;
- a **table** with a masked account-number column;
- a dismissible **callout**;
- an **approval gate** and a submit **button**.

Alongside it, a live **audit-log panel** mirrors `store.getEventLog()` so every dispatched
action is visible — and shows that sensitive values are redacted before they reach the log.
A theme toggle flips `MdmaDocument`'s `theme` prop between light and dark.

## Run

From the repo root (so workspace packages resolve):

```sh
pnpm install
pnpm --filter mdma-example-vue dev
```

Then open the URL Vite prints.

## How it fits together

```
document.ts   the MDMA document (Markdown + fenced mdma blocks) and its data sources
mdma.ts       parse → AST + DocumentStore (seeded with the core attachables)
App.vue       <MdmaDocument :ast :store :customizations :theme /> + the audit-log panel
main.ts       mounts App and imports the renderer's styles.css
```

The headless pieces — `parser`, `runtime`, `attachables-core` — are used exactly as the React
example uses them; only the view layer differs. See the
[package README](../../../packages/renderer-vue/README.md) for the API and the differences from
the React renderer.
