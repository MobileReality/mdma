# @mobile-reality/mdma-agui

Bridge [MDMA](https://github.com/MobileReality/mdma) interactive documents onto the
[AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui). An AG-UI agent streams MDMA
(forms, tables, approval gates) as message text or a tool-call payload; this package renders it
live and routes the user's actions — submit, approve, deny — back into the agent run, closing the
human-in-the-loop.

MDMA owns the **decision surface** (validated, audited, PII-aware components); AG-UI owns the
**control primitive** (suspend/resume via its `interrupt` building block). This adapter is the seam.

> **Layering.** AG-UI is transport; MDMA is payload. This package is a community-maintained
> adapter, not a framework integration — see [`mdma-agui-integration-plan.md`](../../mdma-agui-integration-plan.md).

## Install

```bash
npm install @mobile-reality/mdma-agui \
  @ag-ui/client @ag-ui/core \
  @mobile-reality/mdma-parser @mobile-reality/mdma-runtime \
  @mobile-reality/mdma-spec @mobile-reality/mdma-attachables-core
# React layer only:
npm install @mobile-reality/mdma-renderer-react react
```

All AG-UI, MDMA, and React packages are **peer dependencies** — you bring the versions your app
already uses. `@mobile-reality/mdma-renderer-react` and `react` are optional (headless core works
without them).

## React usage

```tsx
import { HttpAgent } from '@ag-ui/client';
import { MdmaAgentView } from '@mobile-reality/mdma-agui/react';
import '@mobile-reality/mdma-renderer-react/styles.css';

const agent = new HttpAgent({ url: '/api/agent' });

export function Chat() {
  // Streams every MDMA document the agent emits; approvals/forms resume the run automatically.
  return <MdmaAgentView agent={agent} />;
}
```

For finer control, use the hook:

```tsx
import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';

function Chat({ agent }) {
  const { documents } = useMdmaAgentStream(agent, {
    // Return false to resume the run yourself (e.g. resolve an AG-UI interrupt).
    onAction: async (action, message) => {
      console.log('user decided', action.type, 'in', message.messageId);
    },
  });
  return documents.map((d) => <MdmaDocument key={d.messageId} ast={d.ast} store={d.store} />);
}
```

## Headless usage

No React required — subscribe and drive rendering yourself:

```ts
import { createMdmaAgentBridge } from '@mobile-reality/mdma-agui';

const bridge = createMdmaAgentBridge(agent, {
  onDocument: (message) => renderSomewhere(message.ast, message.store),
});

// later
bridge.dispose();
```

## How it works

**Stream → render.** On each `onTextMessageContentEvent`, the bridge reads the *accumulated*
`textMessageBuffer` (no delta bookkeeping), gates on a cheap `containsMdma()` fence check,
throttles re-parsing (~150 ms), and feeds the AST into a document store. The store is created
**once per message** and updated in place with `store.updateAst()` afterward, so in-flight form
edits and focus survive streaming. "Latest content wins" guards async parse ordering.

**Action → resume.** The bridge listens on `store.getEventBus().onAny()` and switches on the
decision events — `ACTION_TRIGGERED` (button / form submit), `APPROVAL_GRANTED`, and
`APPROVAL_DENIED` (approval-gate). By default it packages the decision as a user turn and calls
`agent.addMessage()` + `agent.runAgent()`. Return `false` from `onAction` to take over — e.g.
resolve AG-UI's native interrupt so the parked run resumes with state intact.

## API

| Export | Description |
|---|---|
| `createMdmaAgentBridge(agent, options)` | Headless bridge. Returns `{ documents, flush, dispose }`. |
| `parseMdma(markdown, { existingStore?, createRegistry? })` | Parse text → `{ ast, store }`, reusing a store when given. |
| `containsMdma(text)` | Cheap gate: does the buffer contain an `mdma` fence? |
| `useMdmaAgentStream(agent, options)` *(./react)* | React hook → `{ documents, bridge }`. |
| `MdmaAgentView` *(./react)* | Drop-in component rendering every streamed document. |

### `options` (both `createMdmaAgentBridge` and the hook/view)

- `throttleMs?` — re-parse debounce window (default `150`).
- `createRegistry?` — attachable registry factory (defaults to the core attachables).
- `onDocument?` — fires when a message's store is created/updated (render hook).
- `onAction?` — fires on a user decision; return `false` to suppress the default resume.
- `resume?` — fully replace the default `addMessage` + `runAgent` resume.

## AG-UI coupling

The headless core is written against a **minimal structural agent interface** in
[`src/types.ts`](src/types.ts) — the small slice of `@ag-ui/client`'s `AbstractAgent` /
`AgentSubscriber` and `@ag-ui/core`'s `Message` it touches (`subscribe`, `runAgent`, `addMessage`,
`onTextMessageContentEvent`). A real `HttpAgent` satisfies it by shape, so there is no hard build
dependency on AG-UI and all coupling is isolated to that one file.

It is **not a blind shim**: [`tests/agui-conformance.ts`](tests/agui-conformance.ts) asserts at
type-check time (against the installed `@ag-ui/*`) that a real `AbstractAgent` is assignable to
our `AguiAgent` and our subscriber is accepted by the real `AgentSubscriber`. If AG-UI's API
drifts, `pnpm typecheck` fails there — turning silent runtime drift into a build error. The
conformance file is excluded from the published build.

## License

MIT
