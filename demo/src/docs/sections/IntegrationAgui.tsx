import { Code } from '../Code.js';

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
        <strong>transport</strong> (suspend/resume via its <code>interrupt</code> primitive); MDMA is
        the <strong>payload</strong> (validated, audited, PII-aware components).{' '}
        <code>@mobile-reality/mdma-agui</code> is the seam between them — a community-maintained
        adapter, not a framework integration.
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

      <p>For finer control, use the hook:</p>
      <Code lang="tsx">{`import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';

function Chat({ agent }) {
  const { documents } = useMdmaAgentStream(agent, {
    // Return false to resume the run yourself (e.g. resolve an AG-UI interrupt).
    onAction: async (action, message) => {
      console.log('user decided', action.type, 'in', message.messageId);
    },
  });
  return documents.map((d) => <MdmaDocument key={d.messageId} ast={d.ast} store={d.store} />);
}`}</Code>

      <h3>Headless usage</h3>
      <p>No React required — subscribe and drive rendering yourself:</p>
      <Code lang="ts">{`import { createMdmaAgentBridge } from '@mobile-reality/mdma-agui';

const bridge = createMdmaAgentBridge(agent, {
  onDocument: (message) => renderSomewhere(message.ast, message.store),
});

// later
bridge.dispose();`}</Code>

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
        <code>INTEGRATION_CALLED</code> (webhook trigger). By default it packages the decision as a
        user turn and calls <code>agent.addMessage()</code> + <code>agent.runAgent()</code>. Return{' '}
        <code>false</code> from <code>onAction</code> to take over — e.g. resolve AG-UI's native
        interrupt so the parked run resumes with state intact.
      </p>
      <p>
        A tasklist resumes the run only on the transition into <em>all items checked</em> (its{' '}
        <code>onComplete</code> action), not on every toggle — individual <code>FIELD_CHANGED</code>{' '}
        edits are ignored, the same way in-progress form typing is. A webhook routes its trigger and
        request shape (real HTTP execution is handled by your agent or the webhook engine).
      </p>
    </>
  );
}
