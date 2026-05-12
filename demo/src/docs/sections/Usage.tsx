import { Code } from '../Code.js';

export function Usage() {
  return (
    <>
      <h2>Basic Usage</h2>
      <Code lang="ts">{`import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

// 1. Parse markdown into AST
const processor = unified().use(remarkParse).use(remarkMdma);
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

      <h2>In a Chat</h2>
      <Code lang="ts">{`import { buildSystemPrompt, getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

// Pick the prompt variant tuned for your model
const { prompt: authorPrompt } = getAuthorPromptVariant('google/gemini-2.5-pro');

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
    model: 'gemini-2.5-pro',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'The login page crashes after entering my password.' },
    ],
  }),
});`}</Code>

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

const modelId = 'anthropic/claude-sonnet-4-6';

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
    model: 'claude-sonnet-4-6',
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
