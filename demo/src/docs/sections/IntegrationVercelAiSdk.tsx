import { Code } from '../Code.js';

export function IntegrationVercelAiSdk() {
  return (
    <>
      <h2>Vercel AI SDK</h2>
      <p>
        Vercel AI SDK works out of the box with MDMA — use{' '}
        <code>mdma-prompt-pack</code> for the system prompt, <code>streamText</code> for the LLM
        call, and the standard <code>parse → validate → render</code> pipeline on the streamed
        text. The example below uses the Anthropic provider but the same shape works for OpenAI
        (<code>@ai-sdk/openai</code>) or any other Vercel AI SDK provider.
      </p>

      <h3>Install</h3>
      <Code lang="bash">
        {
          'npm install ai @ai-sdk/anthropic unified remark-parse @mobile-reality/mdma-prompt-pack @mobile-reality/mdma-parser @mobile-reality/mdma-runtime @mobile-reality/mdma-renderer-react @mobile-reality/mdma-validator'
        }
      </Code>

      <h3>Server route (Next.js App Router)</h3>
      <p>
        The recommended setup: keep your provider API key on the server, stream the response to the
        client, and let the browser do the parse + render. <code>buildSystemPrompt</code> wires the
        author prompt to your business-specific <code>customPrompt</code>.
      </p>
      <Code lang="ts">{`// app/api/chat/route.ts
import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { buildSystemPrompt, MDMA_AUTHOR_PROMPT } from '@mobile-reality/mdma-prompt-pack';

export async function POST(req: Request) {
  const { messages, customPrompt } = await req.json();
  const result = streamText({
    model: anthropic('claude-sonnet-4-5-20250929'),
    system: buildSystemPrompt({
      authorPrompt: MDMA_AUTHOR_PROMPT,
      customPrompt,
    }),
    messages,
  });
  return result.toDataStreamResponse();
}`}</Code>

      <h3>Client component</h3>
      <p>
        On the client, the <code>useChat</code> hook from <code>ai/react</code> streams the
        assistant's text. For each completed assistant message, run{' '}
        <code>validate()</code> + <code>parseMarkdown()</code> and hand the resulting ast/store to{' '}
        <code>MdmaDocument</code>.
      </p>
      <Code lang="tsx">{`// app/chat/Chat.tsx
'use client';

import { useChat } from 'ai/react';
import { useEffect, useState } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore, type DocumentStore } from '@mobile-reality/mdma-runtime';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { validate } from '@mobile-reality/mdma-validator';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkMdma, {});

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    body: { customPrompt: 'Help the user file an insurance claim across 3 forms.' },
  });

  return (
    <>
      {messages.map((m) =>
        m.role === 'user' ? (
          <p key={m.id}>{m.content}</p>
        ) : (
          <MdmaMessage key={m.id} markdown={m.content} />
        ),
      )}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </>
  );
}

function MdmaMessage({ markdown }: { markdown: string }) {
  const [doc, setDoc] = useState<{ ast: MdmaRoot; store: DocumentStore } | null>(null);

  useEffect(() => {
    const result = validate(markdown);
    const tree = processor.parse(result.output);
    processor.run(tree).then((ast) =>
      setDoc({ ast: ast as MdmaRoot, store: createDocumentStore(ast as MdmaRoot) }),
    );
  }, [markdown]);

  if (!doc) return null;
  return <MdmaDocument ast={doc.ast} store={doc.store} />;
}`}</Code>

      <h3>Browser-only (no server)</h3>
      <p>
        For prototypes or internal tools where you're OK with the API key in the browser, you can
        call <code>streamText</code> directly client-side. Pass{' '}
        <code>anthropic-dangerous-direct-browser-access: true</code> via the provider's{' '}
        <code>headers</code> option to opt into Anthropic's CORS path.
      </p>
      <Code lang="ts">{`import { createAnthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { buildSystemPrompt, MDMA_AUTHOR_PROMPT } from '@mobile-reality/mdma-prompt-pack';

const anthropic = createAnthropic({
  apiKey: userProvidedKey,
  headers: { 'anthropic-dangerous-direct-browser-access': 'true' },
});

const result = streamText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  system: buildSystemPrompt({
    authorPrompt: MDMA_AUTHOR_PROMPT,
    customPrompt: 'You are an MDMA author. Reply with a single document.',
  }),
  messages: [{ role: 'user', content: userMessage }],
});

let accumulated = '';
for await (const delta of result.textStream) {
  accumulated += delta;
  // optionally re-parse + re-render on each delta for live streaming preview
}`}</Code>

      <h3>Picking a prompt variant</h3>
      <p>
        Same advice as the LangChain page —{' '}
        <code>AUTHOR_PROMPT_VARIANTS</code> from <code>@mobile-reality/mdma-prompt-pack</code>{' '}
        contains a model-tuned prompt for every supported model. Resolve the right one with{' '}
        <code>getAuthorPromptVariant(systemPromptId).prompt</code> and pass that to{' '}
        <code>buildSystemPrompt({'{ authorPrompt }'})</code> instead of the canonical default.
      </p>

      <h3>Two-agent (author sub-agent) pattern</h3>
      <p>
        For chat surfaces where the assistant's visible text should stay conversational and the
        MDMA generation should be hidden behind a tool call (the pattern the Preview view uses),
        wrap MDMA generation in a Vercel AI SDK <code>tool</code> whose{' '}
        <code>execute</code> runs a second <code>generateText</code> call with the author prompt as
        its system message.
      </p>
      <Code lang="ts">{`import { tool, streamText, generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { buildSystemPrompt, MDMA_AUTHOR_PROMPT } from '@mobile-reality/mdma-prompt-pack';
import { z } from 'zod';

const generate_mdma = tool({
  description:
    'Request the MDMA Author sub-agent to produce an interactive MDMA component for the user.',
  parameters: z.object({
    brief: z.string().describe('Natural-language description of the component to generate.'),
  }),
  async execute({ brief }) {
    const { text } = await generateText({
      model: anthropic('claude-sonnet-4-5-20250929'),
      system: buildSystemPrompt({ authorPrompt: MDMA_AUTHOR_PROMPT }),
      messages: [{ role: 'user', content: brief }],
    });
    return text; // the conversation agent gets a short ack; the client uses the streamed tool-call output to render
  },
});

const result = streamText({
  model: anthropic('claude-sonnet-4-5-20250929'),
  system: 'You are a friendly assistant. Use generate_mdma whenever a component is needed.',
  messages,
  tools: { generate_mdma },
});`}</Code>

      <h3>See it working</h3>
      <p>
        The Preview view in this demo implements the two-agent pattern end-to-end (with the
        addition of in-browser <code>validate()</code> + LLM auto-fix on every step). The wiring
        is in <code>demo/src/agent/use-agent.ts</code> and{' '}
        <code>demo/src/preview/use-preview-validation.ts</code> — the Vercel AI SDK version above
        is the same flow expressed in <code>streamText</code> / <code>tool</code> primitives
        instead of raw <code>fetch</code> calls.
      </p>
    </>
  );
}
