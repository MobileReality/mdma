# MDMA × Electron — desktop agent chat with a real trust boundary

An Electron desktop app that streams a model and renders its replies with
[`@mobile-reality/mdma-renderer-react`](../../../packages/renderer-react). The renderer package is
used **unchanged** — Electron's renderer process is Chromium, so MDMA already draws there.

What this example is actually about is the process split. In a browser SPA the policy engine, the
audit log, and the API key all live in the same JS context as the model's output. Electron gives you
a genuine privileged process, so here they don't:

| | Browser SPA | This app |
| :--- | :--- | :--- |
| OpenRouter key | bundled into the page (`VITE_*`) | main process only; never in the renderer bundle |
| `PolicyEngine` | editable from devtools | enforced in main, before any outbound call |
| `ChainedEventLog` | a hash chain the auditee controls | chained and written to disk by main |
| Integration calls | CORS-bound, credentials in the page | run in main with credentials the page never sees |

## Layout

```
src/shared/ipc.ts       channel names + payload types — the one contract all three sides import
src/main/
  index.ts              app lifecycle, BrowserWindow, policy environment
  ipc.ts                thin transport: channels → chat / actions / audit
  chat.ts               OpenRouter SSE streaming; reads the key here and only here
  actions.ts            action host — policy.enforce() then run, with server credentials
  audit.ts              main-owned ChainedEventLog, appended to a JSONL file in userData
src/preload/index.ts    contextBridge → window.mdma (contextIsolation + sandbox on)
src/renderer/src/
  chat/use-chat.ts      chat state; the stream arrives over IPC, not fetch
  chat/stream-parser.ts coalescing re-parse of the growing reply into one DocumentStore
  bridge/run-actions.ts every ACTION_TRIGGERED is executed in main, result dispatched back
  bridge/forward-audit.ts  new store audit entries shipped to main to be chained
  audit/AuditPanel.tsx  live view of the chain + its integrity verdict
```

## Setup

```sh
# from the repo root, so workspace packages resolve
pnpm install

# then, in this folder:
cp .env.example .env
# set MAIN_VITE_OPENROUTER_API_KEY (https://openrouter.ai/keys)
```

`MAIN_VITE_*` is inlined into the **main** bundle only — electron-vite never exposes it to the
renderer. For a packaged build prefer the runtime path: set `OPENROUTER_API_KEY` in the
environment instead, so no key is baked into the artifact.

## Run

```sh
pnpm --filter mdma-example-electron dev     # vite dev server + electron, with HMR
pnpm --filter mdma-example-electron build   # bundle main, preload, renderer into out/
pnpm --filter mdma-example-electron start   # run the built app
```

> Running from a VS Code integrated terminal? It exports `ELECTRON_RUN_AS_NODE=1`, which makes the
> Electron binary boot as plain Node and fail with `Cannot read properties of undefined (reading
> 'whenReady')`. Launch with `env -u ELECTRON_RUN_AS_NODE pnpm …`.

Ask for something with a UI — "help me file a bug report", "collect my shipping details". The
components render inline as the reply streams, and every interaction lands in the audit panel.

## Seeing the boundary work

The system prompt tells the model this host knows exactly two action ids:

- **`submit-intake`** — handled locally in main. Fill in a form the model produces and submit it;
  the result comes back through `INTEGRATION_CALLED` and the panel logs one `integration_called`.
- **`notify-backend`** — gated on the `webhook_call` policy action. A dev run uses the `preview`
  environment, where `createDefaultPolicy()` **denies** it, so the call is refused in the main
  process and the denial is what gets audited. Packaged builds run as `production`, where it is
  allowed; point it at a real endpoint with `INTERNAL_API_URL` / `INTERNAL_API_TOKEN` (both read
  in main, never sent to the renderer).

The audit panel shows each entry's `previousHash → hash` and a live integrity verdict from
`verifyIntegrity()`. Entries are appended to `mdma-audit.jsonl` in Electron's `userData` directory —
the path is shown under the panel heading.

## Honest limits

The `DocumentStore` still lives in the renderer, so field-level entries are *forwarded* to main
rather than produced there — a hostile renderer could withhold one. What it cannot do is rewrite
the chain, forge a link, or fake an integration call: main appends its own authoritative entry for
every action it runs, and the renderer's copy of those is deliberately dropped on the way in. Moving
the whole store into main would close the remaining gap at the cost of an IPC round-trip per
keystroke, which is the tradeoff a production host has to make deliberately.
