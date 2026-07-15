# @mobile-reality/mdma-agui

Bridge [MDMA](https://github.com/MobileReality/mdma) interactive documents onto the
[AG-UI protocol](https://github.com/ag-ui-protocol/ag-ui). An AG-UI agent streams MDMA
(forms, tables, approval gates) as message text or on a dedicated `CUSTOM` event; this package
renders it live, hydrates it from the agent's shared state, and routes the user's actions — submit,
approve, deny — back into the run, closing the human-in-the-loop.

MDMA owns the **decision surface** (validated, audited, PII-aware components); AG-UI owns the
**control primitive** (suspend/resume via its `interrupt` building block). This adapter is the seam.

The two compose because MDMA components are **headless**: a document describes intent (fields,
types, actions) and takes its values from state. AG-UI already standardizes the three things that
needs — streaming documents, carrying shared state, and pausing for a human — so the bridge maps
each onto MDMA instead of inventing plumbing.

> **Layering.** AG-UI is transport; MDMA is payload. This package is a community-maintained
> adapter, not a framework integration.

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

For finer control, use the hook. Alongside `documents` it surfaces the agent's activity, any
interrupts the run is parked on, and its shared state:

```tsx
import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';

function Chat({ agent }) {
  const { documents, activity, interrupts, state, bridge } = useMdmaAgentStream(agent, {
    // Return false to resume the run yourself.
    onAction: async (action, message) => {
      console.log('user decided', action.type, 'in', message.messageId);
    },
  });

  return (
    <>
      {interrupts.length > 0 && <Banner>Waiting on: {interrupts.map((i) => i.id).join(', ')}</Banner>}
      {documents.map((d) => (
        <MdmaDocument key={d.messageId} ast={d.ast} store={d.store} />
      ))}
      <ActivityFeed items={activity} />
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </>
  );
}
```

## Headless usage

No React required — subscribe and drive rendering yourself:

```ts
import { createMdmaAgentBridge } from '@mobile-reality/mdma-agui';

const bridge = createMdmaAgentBridge(agent, {
  onDocument: (message) => renderSomewhere(message.ast, message.store),
  onActivity: (item, feed) => renderActivity(feed),
  onState: (state) => renderState(state),
  onInterrupt: (pending) => renderGateBanner(pending),
});

bridge.documents;     // ReadonlyMap<string, MdmaMessageState>
bridge.activity;      // readonly MdmaActivity[]
bridge.interrupts;    // readonly AguiInterrupt[] — what the run is parked on
bridge.state;         // Readonly<MdmaSharedState>
await bridge.flush(); // force an immediate re-parse of buffered content

// later
bridge.dispose();
```

## Two delivery channels

MDMA can reach the bridge two ways, and both feed the *same* parse → store → render pipeline. Each
message reports which channel it arrived on via `message.source`.

| Channel | How the agent sends it | When to use |
|---|---|---|
| **Inline** — `source: 'text'` | The document sits in the assistant's streamed prose (`TEXT_MESSAGE_CONTENT`). Re-parsed with throttling as it streams. | The agent writes MDMA as part of its reply. |
| **Out-of-band** — `source: 'custom'` | A `CUSTOM` event named `mdma` (`MDMA_CUSTOM_EVENT_NAME`), whose `value` is the markdown string or `{ messageId?, markdown }`. Parsed immediately — the text is already complete. | A tool-calling agent that puts the document in a tool argument, keeping prose and UI on separate channels so no markup leaks into the chat. |

Either way the markdown still carries an `mdma` fence — same format, different channel.

## Shared state

Because components are headless, their values live in AG-UI's shared state. The bridge tracks
`STATE_SNAPSHOT` / `STATE_DELTA` (including JSON-patch deltas) as a `componentId → values` map and
hydrates MDMA stores from it — so a form the agent renders comes up **pre-filled** from what it
already knows.

Hydration is **reactive**: state arriving *after* a component is already on screen is dispatched
into that live store too, so the agent can set a field the user is looking at without re-rendering
the form.

`initialState` takes the same shape at startup — for restoring a persisted conversation so its
forms, approvals, and tasklists render populated.

```ts
const bridge = createMdmaAgentBridge(agent, {
  // Seed stores as they're created (e.g. a conversation fetched from your backend).
  initialState: { 'signup-form': { email: 'ada@example.com' } },
  onState: (state) => console.log('agent knows', state),
});
```

## Agentic activity

Tool calls, run steps, and reasoning streams surface as their own ordered feed — **deliberately
separate** from MDMA. They never enter a document store, so agent chatter and rendered components
stay decoupled: render the feed as a timeline beside the documents, or ignore it entirely.

| Field | Meaning |
|---|---|
| `id` | Stable across the item's lifetime (tool-call id, step handle, reasoning message id). |
| `kind` | `'tool'` · `'step'` · `'reasoning'` |
| `label` | The tool name, the step name, or `reasoning`. |
| `status` | `'running'` → `'done'` |
| `detail` | Streamed detail — accumulating tool args, the tool result, or the reasoning text. |

## Human-in-the-loop

When a run parks on AG-UI interrupts (a `RUN_FINISHED` carrying an `interrupt` outcome), the bridge
exposes the pending set as `bridge.interrupts` and fires `onInterrupt`. Answering the component an
interrupt refers to resolves **that** interrupt with `runAgent({ resume })`, so the parked run
continues with its state intact instead of starting a fresh turn.

`resumeMode` controls how a user decision resumes the run:

| Mode | Behavior |
|---|---|
| `'auto'` *(default)* | Resolve a matching interrupt if the run is parked on one; otherwise fall back to a fresh user turn. |
| `'interrupt'` | Only ever resolve a matching interrupt; if none matches, do nothing. |
| `'user-turn'` | Always open a fresh user turn (`addMessage` + `runAgent`). |

For full control, `onAction` returning `false` hands resumption to you, and `resume` replaces the
built-in interrupt and user-turn paths entirely.

## How it works

**Stream → render.** On each `onTextMessageContentEvent`, the bridge reads the *accumulated*
`textMessageBuffer` (no delta bookkeeping), gates on a cheap `containsMdma()` fence check,
throttles re-parsing (~150 ms), and feeds the AST into a document store. Out-of-band `CUSTOM`
documents go through the same path but parse immediately, since their text arrives complete. The
store is created **once per message** and updated in place with `store.updateAst()` afterward, so
in-flight form edits and focus survive streaming. "Latest content wins" guards async parse ordering.

**Action → resume.** The bridge listens on `store.getEventBus().onAny()` and switches on the
decision events — `ACTION_TRIGGERED` (button, form submit, tasklist completion),
`APPROVAL_GRANTED` / `APPROVAL_DENIED` (approval-gate), and `INTEGRATION_CALLED` (webhook trigger)
— then resumes according to `resumeMode`: resolving the matching interrupt where there is one,
otherwise packaging the decision as a user turn (`addMessage` + `runAgent`).

A tasklist resumes the run only on the transition into *all items checked* (its `onComplete`
action), not on every toggle — individual `FIELD_CHANGED` edits are ignored, the same way
in-progress form typing is. A webhook routes its trigger and request shape (real HTTP execution is
handled by your agent or the webhook engine).

## API

| Export | Description |
|---|---|
| `createMdmaAgentBridge(agent, options)` | Headless bridge → `{ documents, activity, interrupts, state, flush, dispose }`. |
| `MDMA_CUSTOM_EVENT_NAME` | The `CUSTOM` event name (`'mdma'`) carrying out-of-band documents. |
| `parseMdma(markdown, { existingStore?, createRegistry?, initialState? })` | Parse text → `{ ast, store }`, reusing a store when given. |
| `containsMdma(text)` | Cheap gate: does the buffer contain an `mdma` fence? |
| `createDefaultRegistry()` | The default attachable registry used by new stores. |
| `useMdmaAgentStream(agent, options)` *(./react)* | React hook → `{ documents, activity, interrupts, state, bridge }`. |
| `MdmaAgentView` *(./react)* | Drop-in component rendering every streamed document. |

Types: `MdmaAgentBridge`, `MdmaAgentBridgeOptions`, `MdmaMessageState`, `MdmaSourceOrigin`,
`MdmaActionEvent`, `MdmaActivity`, `MdmaActivityKind`, `MdmaActivityStatus`, `MdmaSharedState`, plus
the structural AG-UI types (`AguiAgent`, `AguiInterrupt`, `AguiResumeEntry`, …).

### `options` (both `createMdmaAgentBridge` and the hook/view)

| Option | Purpose |
|---|---|
| `onDocument?` | A message's store was created/updated from newly parsed MDMA — the render hook. |
| `onActivity?` | A tool call / step / reasoning item was created or advanced. Observational. |
| `onState?` | The agent's shared state changed. Observational. |
| `onInterrupt?` | The run parked on human-in-the-loop interrupts. |
| `onAction?` | A user decision fired; return `false` to suppress the default resume. |
| `resumeMode?` | How decisions resume the run — `'auto'` (default) · `'interrupt'` · `'user-turn'`. |
| `resume?` | Fully replace the built-in resume behavior. |
| `initialState?` | Seed component values when stores are first created. |
| `throttleMs?` | Re-parse debounce window (default `150`). |
| `createRegistry?` | Attachable registry factory (defaults to the core attachables). |
| `now?` | Injectable clock (ms). Defaults to `Date.now`; overridden in tests. |

## AG-UI coupling

The headless core is written against a **minimal structural agent interface** in
[`src/types.ts`](src/types.ts) — the slice of `@ag-ui/client`'s `AbstractAgent` / `AgentSubscriber`
and `@ag-ui/core`'s `Message` it touches (`subscribe`, `runAgent`, `addMessage`, and the text,
custom, tool/step/reasoning, state, and run-lifecycle subscriber hooks). A real `HttpAgent`
satisfies it by shape, so there is no hard build dependency on AG-UI and all coupling is isolated
to that one file.

It is **not a blind shim**: [`tests/agui-conformance.ts`](tests/agui-conformance.ts) asserts at
type-check time (against the installed `@ag-ui/*`) that a real `AbstractAgent` is assignable to
our `AguiAgent` and our subscriber is accepted by the real `AgentSubscriber`. If AG-UI's API
drifts, `pnpm typecheck` fails there — turning silent runtime drift into a build error. The
conformance file is excluded from the published build.

## Example

A runnable backend + React frontend using every piece above — a tool-calling agent, MDMA over
`CUSTOM` events, shared state, interrupts, and the activity feed — lives in
[`examples/integrations/ag-ui`](../../examples/integrations/ag-ui).

## License

MIT
