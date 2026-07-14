import { Code } from '../Code.js';
import { Table } from '../Table.js';

export function IntegrationAgui() {
  return (
    <>
      <h2>AG-UI Protocol</h2>
      <p>
        Stream MDMA documents from an{' '}
        <a href="https://github.com/ag-ui-protocol/ag-ui" target="_blank" rel="noreferrer">
          AG-UI
        </a>{' '}
        agent and route the user's decisions back into the run. AG-UI is the{' '}
        <strong>transport</strong> (suspend/resume via its <code>interrupt</code> primitive); MDMA
        is the <strong>payload</strong> (validated, audited, PII-aware components).{' '}
        <code>@mobile-reality/mdma-agui</code> is the seam between them — a community-maintained
        adapter, not a framework integration.
      </p>
      <p>
        The two compose because MDMA components are <strong>headless</strong>: a document describes
        intent (fields, types, actions) and takes its values from state. AG-UI already standardizes
        the three things that needs — streaming documents, carrying shared state, and pausing for a
        human — so the bridge maps each onto MDMA instead of inventing plumbing.
      </p>

      <h3>Install</h3>
      <Code lang="bash">
        {
          'npm install @mobile-reality/mdma-agui @ag-ui/client @ag-ui/core @mobile-reality/mdma-parser @mobile-reality/mdma-runtime @mobile-reality/mdma-spec @mobile-reality/mdma-attachables-core\n# React layer only:\nnpm install @mobile-reality/mdma-renderer-react react'
        }
      </Code>
      <p>
        All AG-UI, MDMA, and React packages are <strong>peer dependencies</strong> — you bring the
        versions your app already uses. <code>@mobile-reality/mdma-renderer-react</code> and{' '}
        <code>react</code> are optional (the headless core works without them).
      </p>

      <h3>React usage</h3>
      <Code lang="tsx">{`import { HttpAgent } from '@ag-ui/client';
import { MdmaAgentView } from '@mobile-reality/mdma-agui/react';
import '@mobile-reality/mdma-renderer-react/styles.css';

const agent = new HttpAgent({ url: '/api/agent' });

// Renders every MDMA document the agent streams;
// form submits and approvals resume the run automatically.
export function Chat() {
  return <MdmaAgentView agent={agent} />;
}`}</Code>

      <p>
        For finer control, use the hook. Alongside <code>documents</code> it surfaces the agent's
        activity, any interrupts the run is parked on, and its shared state:
      </p>
      <Code lang="tsx">{`import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
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
}`}</Code>

      <h3>Headless usage</h3>
      <p>No React required — subscribe and drive rendering yourself:</p>
      <Code lang="ts">{`import { createMdmaAgentBridge } from '@mobile-reality/mdma-agui';

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
bridge.dispose();`}</Code>

      <h3>Two delivery channels</h3>
      <p>
        MDMA can reach the bridge two ways, and both feed the <em>same</em> parse → store → render
        pipeline. Each message reports which channel it arrived on via <code>message.source</code>.
      </p>
      <Table
        headers={['Channel', 'How the agent sends it', 'When to use']}
        rows={[
          [
            "Inline — source: 'text'",
            "The document sits in the assistant's streamed prose (TEXT_MESSAGE_CONTENT). Re-parsed with throttling as it streams.",
            'The agent writes MDMA as part of its reply.',
          ],
          [
            "Out-of-band — source: 'custom'",
            'A CUSTOM event named "mdma" (MDMA_CUSTOM_EVENT_NAME), whose value is the markdown string or { messageId?, markdown }. Parsed immediately — the text is already complete.',
            'A tool-calling agent that puts the document in a tool argument, keeping prose and UI on separate channels so no markup leaks into the chat.',
          ],
        ]}
      />
      <p>
        Either way the markdown still carries an <code>mdma</code> fence — same format, different
        channel.
      </p>

      <h3>Shared state</h3>
      <p>
        Because components are headless, their values live in AG-UI's shared state. The bridge
        tracks <code>STATE_SNAPSHOT</code> / <code>STATE_DELTA</code> as a{' '}
        <code>componentId → values</code> map and hydrates MDMA stores from it — so a form the agent
        renders comes up <strong>pre-filled</strong> from what it already knows.
      </p>
      <p>
        Hydration is <strong>reactive</strong>: state arriving <em>after</em> a component is already
        on screen is pushed into that live store too, so the agent can set a field the user is
        looking at without re-rendering the form.
      </p>
      <p>
        <code>initialState</code> takes the same shape at startup — for restoring a persisted
        conversation so its forms, approvals, and tasklists render populated.
      </p>
      <Code lang="ts">{`const bridge = createMdmaAgentBridge(agent, {
  // Seed stores as they're created (e.g. a conversation fetched from your backend).
  initialState: { 'signup-form': { email: 'ada@example.com' } },
  onState: (state) => console.log('agent knows', state),
});`}</Code>

      <h3>Agentic activity</h3>
      <p>
        Tool calls, run steps, and reasoning streams surface as their own ordered feed —{' '}
        <strong>deliberately separate</strong> from MDMA. They never enter a document store, so
        agent chatter and rendered components stay decoupled: render the feed as a timeline beside
        the documents, or ignore it entirely.
      </p>
      <Table
        headers={['Field', 'Meaning']}
        rows={[
          [
            'id',
            'Stable across the item’s lifetime (tool-call id, step handle, reasoning message id).',
          ],
          ['kind', "'tool' · 'step' · 'reasoning'"],
          ['label', 'The tool name, the step name, or “reasoning”.'],
          ['status', "'running' → 'done'"],
          [
            'detail',
            'Streamed detail — accumulating tool args, the tool result, or the reasoning text.',
          ],
        ]}
      />

      <h3>Human-in-the-loop</h3>
      <p>
        When a run parks on AG-UI interrupts (a <code>RUN_FINISHED</code> carrying an{' '}
        <code>interrupt</code> outcome), the bridge exposes the pending set as{' '}
        <code>bridge.interrupts</code> and fires <code>onInterrupt</code>. Answering the matching
        component resolves <em>that</em> interrupt with <code>runAgent({'{ resume }'})</code>, so
        the parked run continues with its state intact instead of starting a fresh turn.
      </p>
      <p>
        <code>resumeMode</code> controls how a user decision resumes the run:
      </p>
      <Table
        headers={['Mode', 'Behavior']}
        rows={[
          [
            "'auto' (default)",
            'If the parked run has an interrupt matching the answered component, resolve that interrupt. Otherwise fall back to a fresh user turn.',
          ],
          ["'interrupt'", 'Only ever resolve a matching interrupt; if none matches, do nothing.'],
          ["'user-turn'", 'Always open a fresh user turn (addMessage + runAgent).'],
        ]}
      />
      <p>
        For full control, <code>onAction</code> returning <code>false</code> hands resumption to
        you, and the <code>resume</code> option replaces the built-in interrupt and user-turn paths
        entirely.
      </p>

      <h3>How it works</h3>
      <p>
        <strong>Stream → render.</strong> On each streamed content event the bridge reads the
        accumulated buffer, gates on a cheap <code>mdma</code>-fence check, throttles re-parsing
        (~150&nbsp;ms), and feeds the AST into a document store. The store is created{' '}
        <strong>once per message</strong> and updated in place with <code>store.updateAst()</code>,
        so in-flight form edits and focus survive streaming.
      </p>
      <p>
        <strong>Action → resume.</strong> The bridge listens for the decision events —{' '}
        <code>ACTION_TRIGGERED</code> (button, form submit, tasklist completion),{' '}
        <code>APPROVAL_GRANTED</code> / <code>APPROVAL_DENIED</code> (approval-gate), and{' '}
        <code>INTEGRATION_CALLED</code> (webhook trigger) — then resumes according to{' '}
        <code>resumeMode</code>: resolving the matching interrupt where there is one, otherwise
        packaging the decision as a user turn (<code>addMessage</code> + <code>runAgent</code>).
      </p>
      <p>
        A tasklist resumes the run only on the transition into <em>all items checked</em> (its{' '}
        <code>onComplete</code> action), not on every toggle — individual <code>FIELD_CHANGED</code>{' '}
        edits are ignored, the same way in-progress form typing is. A webhook routes its trigger and
        request shape (real HTTP execution is handled by your agent or the webhook engine).
      </p>

      <h3>Options</h3>
      <Table
        headers={['Option', 'Purpose']}
        rows={[
          [
            'onDocument',
            'A message’s store was created or updated from newly parsed MDMA — the render hook.',
          ],
          [
            'onActivity',
            'A tool call / step / reasoning item was created or advanced. Observational.',
          ],
          ['onState', 'The agent’s shared state changed. Observational.'],
          ['onInterrupt', 'The run parked on human-in-the-loop interrupts.'],
          ['onAction', 'A user decision fired. Return false to take over resumption.'],
          ['resumeMode', "How decisions resume the run — 'auto' · 'interrupt' · 'user-turn'."],
          ['resume', 'Replace the built-in resume behavior entirely.'],
          ['initialState', 'Seed component values when stores are first created.'],
          ['throttleMs', 'Debounce between re-parses of a streaming message. Default 150.'],
          [
            'createRegistry',
            'Registry factory for the document store (defaults to the core attachables).',
          ],
        ]}
      />

      <h3>End-to-end example</h3>
      <p>
        A runnable backend + React frontend using every piece above — a tool-calling agent, MDMA
        over CUSTOM events, shared state, interrupts, and the activity feed — lives in{' '}
        <code>examples/integrations/ag-ui</code> in the repo.
      </p>
    </>
  );
}
