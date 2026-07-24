# MDMA × Vue — agent chat example

A frontend-only Vue 3 chat app that streams a model through **OpenRouter** and renders its
replies with [`@mobile-reality/mdma-renderer-vue`](../../../packages/renderer-vue). The model is
prompted with the MDMA author prompt, so when a UI would help it answers with `mdma` fenced
blocks — a form, a table, an approval gate — and the renderer draws them inline in the chat, live
as the response streams.

It's the Vue counterpart of the React demo's agent chat, kept deliberately small: no backend, no
AG-UI, no tool-calling. Just chat in, MDMA out, rendered.

## Setup

```sh
# from the repo root, so workspace packages resolve
pnpm install

# then, in this folder:
cp .env.example .env
# edit .env and set VITE_OPENROUTER_API_KEY (https://openrouter.ai/keys)
```

> **The key ships to the browser.** A `VITE_` variable is bundled into the client, so this is a
> local-demo pattern only. A real app proxies OpenRouter through a backend — see the
> [ag-ui example](../../integrations/ag-ui) — so the key never leaves the server.

## Run

```sh
pnpm --filter mdma-example-vue dev
```

Open the URL Vite prints and ask for something with a UI — "help me file a bug report", "collect
my shipping details", "show me a sales summary as a table". Watch the components render (and
briefly show loading skeletons) as the reply streams in.

Set a different model with `VITE_MDMA_MODEL` in `.env` (any OpenRouter slug; defaults to
`openai/gpt-5.6-luna`).

## Charts and a 3D custom component

Two host customizations are passed to every `MdmaDocument` (see `src/custom/`):

- **2D charts** — [ChartRenderer.ts](src/custom/ChartRenderer.ts) overrides the built-in `chart`
  renderer (which draws a table) with a real inline-SVG chart: `variant: bar | line | area | pie`.
  This is a plain component override via `customizations.components.chart`.
- **A 3D graph** — [Graph3D.ts](src/custom/Graph3D.ts) is a host-registered **custom component**
  (`type: custom`, `name: graph-3d`): an interactive WebGL bar chart (three.js) over two
  categorical axes. Clicking a bar dispatches into the store, so the selection shows in the action
  log and fires `actions.onSelect`. It's registered via `customizations.customVariants['graph-3d']`
  and advertised to the model with `buildSystemPrompt({ customComponents: [...] })` — the author
  prompt forbids inventing a custom `name` that isn't in that catalog. three.js is code-split and
  loaded on demand, only when a `graph-3d` first appears.

Try "chart our quarterly revenue" or "show sales by region and quarter as a 3D graph".

## How it fits together

```
agent.ts          system prompt (author prompt + graph-3d catalog) + suggestions
openrouter.ts     streaming chat client, key from import.meta.env.VITE_OPENROUTER_API_KEY
mdma.ts           parse Markdown → AST; parse-into-store for streamed re-parses (updateAst)
useChat.ts        chat state: each assistant turn owns a DocumentStore + action log
custom/           chart override + the graph-3d custom variant, bundled as CUSTOMIZATIONS
ChatMessage.vue   one turn — assistant turns render via <MdmaDocument :ast :store :theme :customizations />
App.vue           the chat shell: thread, composer, suggestions, action log, theme toggle
main.ts           mounts App, imports the renderer's styles.css
```

The interesting part is in `useChat.ts`: an assistant reply is a growing Markdown string, and
each chunk is folded into the same store via `store.updateAst(...)`. That's what lets a form the
model is still writing appear immediately and keep any value you've already typed into it — the
same streaming-state-preservation the renderer is built around.

The headless stack (`parser`, `runtime`, `attachables-core`, `prompt-pack`) is used exactly as
the React demo uses it; only the view layer is Vue. See the
[package README](../../../packages/renderer-vue/README.md) for the renderer API.
