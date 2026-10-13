import { useEffect, useRef, useState } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { createDocumentStore, type DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { parseMarkdown } from '../../chat/parse-markdown.js';
import { Code } from '../Code.js';

export interface UsageProps {
  /** Whether the right-side hydration preview is open (owned by DocsView). */
  exampleOpen?: boolean;
  /** Toggle the hydration preview panel. */
  onToggleExample?: () => void;
}

export function Usage({ exampleOpen, onToggleExample }: UsageProps = {}) {
  return (
    <>
      <h2>Basic Usage</h2>
      <Code lang="ts">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

// 1. Parse markdown into AST
const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma);
const tree = processor.parse(markdown);
const ast = (await processor.run(tree)) as MdmaRoot;

// 2. Create a reactive document store
const store = createDocumentStore(ast, {
  documentId: 'my-doc',
  sessionId: crypto.randomUUID(),
});

// 3. Subscribe to state changes
store.subscribe((state) => {
  console.log('Bindings:', state.bindings);
});

// 4. Dispatch user actions
store.dispatch({
  type: 'FIELD_CHANGED',
  componentId: 'intake-form',
  field: 'patient-name',
  value: 'Jane Doe',
});`}</Code>

      <h2>Restoring State</h2>
      <p>
        When you reload a past conversation, the MDMA documents re-parse from scratch, so their
        forms, approvals, and checklists come back empty. To render them pre-populated with what the
        user previously entered, snapshot the state to your backend and pass it back in via the{' '}
        <code>initialState</code> option — a <code>{'{ [componentId]: values }'}</code> map,
        symmetric with <code>getState()</code>.
      </p>
      <p>
        Hydration overlays the AST defaults{' '}
        <strong>
          without emitting audit events or marking fields <code>touched</code>
        </strong>
        , so a restore never looks like fresh user activity in the tamper-evident log. It applies
        only to freshly-created components, so a later streamed re-parse never clobbers an in-flight
        edit.
      </p>
      <Code lang="ts">{`// 1. Persist — snapshot each component's values on the way out
const snapshot = Object.fromEntries(
  [...store.getState().components].map(([id, c]) => [id, c.values]),
);
// → { 'intake-form': { 'patient-name': 'Jane Doe' }, 'approve-1': { status: 'approved' } }
await fetch('/api/conversations/42/state', {
  method: 'PUT',
  body: JSON.stringify(snapshot),
});

// 2. Restore — fetch the snapshot on reload and seed the store
const initialState = await fetch('/api/conversations/42/state').then((r) => r.json());

const store = createDocumentStore(ast, {
  documentId: 'my-doc',
  initialState, // component values are hydrated during store creation
});`}</Code>
      {onToggleExample && (
        <button
          type="button"
          className={`docs-example-toggle${exampleOpen ? ' docs-example-toggle--active' : ''}`}
          onClick={onToggleExample}
        >
          {exampleOpen ? 'Hide live example ✕' : 'Show live example →'}
        </button>
      )}
      <p className="docs-note">
        Using the AG-UI adapter? Pass the same map to{' '}
        <code>
          &lt;MdmaAgentView initialState={'{…}'}
          /&gt;
        </code>{' '}
        — each replayed message hydrates only the component ids it contains.
      </p>

      <h2>In a Chat</h2>
      <Code lang="ts">{`import { buildSystemPrompt, getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

// Pick the prompt variant tuned for your model (ids come from AUTHOR_PROMPT_VARIANTS)
const { prompt: authorPrompt } = getAuthorPromptVariant('openai/gpt-6.1-sol');

const systemPrompt = buildSystemPrompt({
  authorPrompt,
  customPrompt: \`You are a bug tracking assistant. When a user reports a bug,
always generate a single form component matching this exact structure: ...\`,
});

// Send to any OpenAI-compatible API
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: \`Bearer \${apiKey}\` },
  body: JSON.stringify({
    model: 'gpt-6.1-sol',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'The login page crashes after entering my password.' },
    ],
  }),
});`}</Code>

      <p className="docs-note">
        <code>getAuthorPromptVariant(id)</code> returns the prompt tuned for that model and falls
        back to <code>default</code> for an unknown id. The demo does this for you: picking a model
        in its chat or agent settings selects the matching variant through its model-to-variant
        mapping.
      </p>

      <h2>External Data Sources</h2>
      <p>
        Tables, charts, and form selects can take their data from your system instead of from the
        model. The LLM writes <code>{'{ source, params }'}</code> and never the rows; you register
        what each source name means. A source has a <code>kind</code>: <code>rows</code> feeds a
        table, <code>series</code> feeds a chart, and <code>options</code> feeds a form select. When
        the same data is needed as a table and as a chart, declare two sources — a{' '}
        <code>rows</code> one and a <code>series</code> one.
      </p>
      <Code lang="mdma">{`type: table
id: open-incidents
columns:
  - key: title
    header: Title
data:
  source: incidents
  params:
    status: open
    service: "{{filters.service}}"   # params may be bindings`}</Code>
      <Code lang="ts">{`import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import { defineDataSource } from '@mobile-reality/mdma-spec';
import type { DataSourceResolver } from '@mobile-reality/mdma-spec';

const resolveIncidents: DataSourceResolver = async (request, { signal }) => {
  const { params, page, pageSize, sort, filter } = request;
  const query = new URLSearchParams({ status: String(params.status) });
  if (page !== undefined) query.set('page', String(page));
  if (pageSize !== undefined) query.set('pageSize', String(pageSize));
  if (sort) query.set('sort', \`\${sort.key}:\${sort.direction}\`);
  if (filter) query.set('q', filter);

  const response = await fetch(\`/api/incidents?\${query}\`, { signal });
  if (!response.ok) throw new Error(\`Incidents request failed (\${response.status})\`);
  const body = (await response.json()) as { items: unknown[]; count: number };
  return { rows: body.items, total: body.count };
};

const incidents = defineDataSource({
  name: 'incidents',
  description: 'Operational incidents raised against internal services.',
  kind: 'rows',
  columns: [
    { key: 'title', type: 'string', sensitive: false },
    { key: 'severity', type: 'string', sensitive: false },
  ],
  params: [
    { name: 'status', type: 'string', required: true, allowed: ['open', 'resolved'] },
    { name: 'service', type: 'string', required: false },
  ],
  resolve: resolveIncidents,
});

const store = createDocumentStore(ast, { dataSources: [incidents] });`}</Code>
      <p>
        The resolver receives the params (bindings already replaced), the page, page size, sort, and
        filter, plus an <code>AbortSignal</code>. Return <code>{'{ rows, total }'}</code> for the
        requested page. When <code>total</code> is omitted, <code>rows</code> is taken as exactly
        the requested page: the runtime applies no client-side paging, sorting, or filtering, and
        the total stays unknown. A plain array as <code>resolve</code> is paged, sorted, and
        filtered by the runtime. Param changes and filter typing are debounced by 150 ms, and the
        signal is aborted when a newer request replaces the one in flight.
      </p>
      <p>
        Loading, error (with Retry), and empty states render out of the box and can be replaced with
        the <code>dataLoading</code>, <code>dataError</code>, and <code>dataEmpty</code> element
        overrides. Pass the same definitions to the prompt, the validator, and the fixer so the
        model only references sources that exist:
      </p>
      <Code lang="ts">{`import { buildSystemPrompt, buildFixerMessage } from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';

const dataSources = [incidents];

const systemPrompt = buildSystemPrompt({ dataSources });

// The data-source rule checks source names, kinds, params, and columns against the catalog
const result = validate(markdown, { dataSourceCatalog: dataSources });
const unfixed = result.issues.filter((issue) => !issue.fixed);
const fixerMessage = buildFixerMessage(markdown, unfixed, { dataSources });`}</Code>
      <p className="docs-note">
        In the demo, turn on <strong>External data sources</strong> in the agent settings to give
        the agent four prepared sources: <code>incidents</code>, <code>countries</code>,{' '}
        <code>sales-by-month</code> (a series), and <code>sales-records</code> (the same data as
        rows). A runnable page lives in <code>examples/playgrounds/data-sources</code>. The{' '}
        <strong>External Data Sources</strong> guide in <code>docs/guides</code> covers the full
        contract.
      </p>

      <h2>React</h2>
      <Code lang="tsx">{`import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import '@mobile-reality/mdma-renderer-react/styles.css'; // default styles

function App({ ast, store }) {
  return <MdmaDocument ast={ast} store={store} />;
}`}</Code>
      <p className="docs-note">
        The <code>styles.css</code> import provides default styling for all MDMA components. It's
        optional — you can write your own styles targeting the <code>.mdma-*</code> CSS classes
        instead.
      </p>

      <h2>Agentic Workflow</h2>
      <p>
        MDMA slots into any existing agent as one additional tool — alongside your database queries,
        web searches, API calls, or whatever else your agent already does. The model decides when to
        call <code>generate_mdma</code> to surface structured UI; everything else in your toolset
        stays unchanged.
      </p>

      <h3>1. Add the tool alongside your existing tools</h3>
      <p>
        Define <code>generate_mdma</code> and append it to your existing tool list. Your other tools
        are untouched.
      </p>
      <Code lang="ts">{`// Your existing tools — unchanged
const YOUR_EXISTING_TOOLS = [
  {
    name: 'search_web',
    description: 'Search the web for up-to-date information.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'query_database',
    description: 'Run a read-only SQL query against the app database.',
    input_schema: { type: 'object', properties: { sql: { type: 'string' } }, required: ['sql'] },
  },
  // ...
];

// Drop in the MDMA tool alongside the rest
const GENERATE_MDMA_TOOL = {
  name: 'generate_mdma',
  description:
    'Generate an MDMA Markdown document to present structured interactive content ' +
    'to the user — forms, tables, charts, approval gates, checklists, and more.',
  input_schema: {
    type: 'object',
    properties: { document: { type: 'string', description: 'The complete MDMA Markdown document.' } },
    required: ['document'],
  },
};

const tools = [...YOUR_EXISTING_TOOLS, GENERATE_MDMA_TOOL];`}</Code>

      <h3>2. Compose the system prompt</h3>
      <p>
        Use <code>buildSystemPrompt</code> to merge your own agent instructions with the MDMA author
        prompt (teaches the model the spec) and the agent-tool prompt (tells it to call the tool
        rather than write MDMA inline). Your custom instructions remain front and center.
      </p>
      <Code lang="ts">{`import {
  buildSystemPrompt,
  getAuthorPromptVariant,
  getAgentToolPromptVariant,
} from '@mobile-reality/mdma-prompt-pack';

const modelId = 'anthropic/opus-4.8'; // a variant id present in both prompt registries

const systemPrompt = buildSystemPrompt({
  // MDMA spec knowledge — injected automatically
  authorPrompt: getAuthorPromptVariant(modelId).prompt,

  // Your agent's own instructions + MDMA tool-call guidance
  customPrompt: \`
You are a support agent for Acme Corp. You have access to the company knowledge base,
can look up customer records, and can run SQL reports. When the user needs to fill out
a structured form, review a data table, or approve a workflow step, use the
generate_mdma tool to render the appropriate UI component.

\${getAgentToolPromptVariant(modelId).prompt}
  \`.trim(),
});`}</Code>

      <h3>
        3. Handle <code>generate_mdma</code> calls in the loop
      </h3>
      <p>
        The loop dispatches each tool call to the right handler. MDMA documents are parsed and
        rendered; your other tools run as usual. Both return a <code>tool_result</code> so the model
        can continue.
      </p>
      <Code lang="ts">{`import Anthropic from '@anthropic-ai/sdk';
import { parseMarkdown } from '@mobile-reality/mdma-parser';

const client = new Anthropic({ apiKey });
const history = [{ role: 'user', content: userMessage }];

let continueLoop = true;

while (continueLoop) {
  const message = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8192,
    system: systemPrompt,
    tools,
    messages: history,
  });

  history.push({ role: 'assistant', content: message.content });

  if (message.stop_reason === 'tool_use') {
    const toolResults = await Promise.all(
      message.content
        .filter((b) => b.type === 'tool_use')
        .map(async (b) => {
          if (b.name === 'generate_mdma') {
            // Parse the MDMA document and hand it to your renderer
            const { ast, store } = await parseMarkdown(b.input.document);
            renderDocument(ast, store); // your render call
            return { type: 'tool_result', tool_use_id: b.id, content: 'Document rendered successfully.' };
          }

          // All other tools — your existing dispatch logic
          const result = await dispatchTool(b.name, b.input);
          return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(result) };
        }),
    );

    history.push({ role: 'user', content: toolResults });
  } else {
    continueLoop = false;
  }
}`}</Code>

      <h3>4. Render MDMA documents in React</h3>
      <Code lang="tsx">{`import { useState } from 'react';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

function AgentView() {
  const [doc, setDoc] = useState<{ ast: MdmaRoot; store: DocumentStore } | null>(null);

  // renderDocument above calls setDoc({ ast, store })

  return doc
    ? <MdmaDocument ast={doc.ast} store={doc.store} />
    : <p>Waiting for the model…</p>;
}`}</Code>
    </>
  );
}

// ─── Restoring-state live preview (rendered in the right-side panel by DocsView) ──────────────

const HYDRATION_EXAMPLE = `\`\`\`mdma
type: form
id: intake-form
onSubmit: submit-intake
fields:
  - name: full-name
    type: text
    label: "Full Name"
  - name: email
    type: email
    label: "Email"
    sensitive: true
  - name: reason
    type: textarea
    label: "Reason for Visit"
\`\`\``;

/** Snapshot as it would come back from a backend for a re-opened conversation. */
const HYDRATION_SNAPSHOT = {
  'intake-form': {
    'full-name': 'Jane Doe',
    email: 'jane@clinic.example',
    reason: 'Annual check-up — mild recurring headaches.',
  },
};

type HydrationPhase = 'empty' | 'loading' | 'hydrated';

export function UsageHydrationPreview() {
  const [ast, setAst] = useState<MdmaRoot | null>(null);
  const [store, setStore] = useState<DocumentStore | null>(null);
  const [phase, setPhase] = useState<HydrationPhase>('empty');
  const cancelRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The conversation re-opens with an EMPTY store — its values live in the backend.
  useEffect(() => {
    cancelRef.current = false;
    parseMarkdown(HYDRATION_EXAMPLE).then((result) => {
      if (cancelRef.current) return;
      setAst(result.ast);
      setStore(result.store);
    });
    return () => {
      cancelRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function fetchState() {
    if (!ast || phase === 'loading') return;
    setPhase('loading');
    // Simulate the backend round-trip, then rebuild the store hydrated from the snapshot — the
    // exact call the docs describe: createDocumentStore(ast, { initialState }).
    timerRef.current = setTimeout(() => {
      setStore(createDocumentStore(ast, { initialState: HYDRATION_SNAPSHOT }));
      setPhase('hydrated');
    }, 2000);
  }

  function reset() {
    if (!ast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setStore(createDocumentStore(ast));
    setPhase('empty');
  }

  const status: Record<HydrationPhase, string> = {
    empty: 'Form is empty — its values live in your backend.',
    loading: 'GET /api/conversations/42/state …',
    hydrated: 'Applied via initialState — no forged audit events.',
  };

  return (
    <>
      <div className="docs-preview-panel-header">
        <span className="docs-preview-panel-label">Re-opened conversation</span>
        <code className="docs-preview-panel-type">initialState</code>
      </div>
      <div className="docs-preview-panel-body">
        <div className="docs-convo-toolbar">
          <button
            type="button"
            className="docs-example-toggle"
            onClick={phase === 'hydrated' ? reset : fetchState}
            disabled={phase === 'loading' || !ast}
          >
            {phase === 'loading'
              ? 'Fetching…'
              : phase === 'hydrated'
                ? 'Reset'
                : 'Fetch saved state →'}
          </button>
          <span className="docs-convo-status">{status[phase]}</span>
        </div>

        <div className="docs-convo-thread">
          <div className="docs-convo-msg docs-convo-msg--agent">
            <div className="docs-convo-avatar">AI</div>
            <div className="docs-convo-bubble">
              <p>Welcome back! Here's the intake form from our last chat:</p>
              <div
                className={`docs-convo-form${phase === 'hydrated' ? ' docs-convo-form--flash' : ''}`}
              >
                {store && ast ? (
                  <MdmaDocument key={phase} ast={ast} store={store} />
                ) : (
                  <span className="docs-preview-panel-loading">Loading…</span>
                )}
              </div>
            </div>
          </div>

          <div className="docs-convo-msg docs-convo-msg--user">
            <div className="docs-convo-bubble">Yep, those are my details — thanks!</div>
            <div className="docs-convo-avatar docs-convo-avatar--user">You</div>
          </div>
        </div>
      </div>
    </>
  );
}
