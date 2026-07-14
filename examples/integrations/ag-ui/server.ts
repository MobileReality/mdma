/**
 * AG-UI integration example — backend. A real AG-UI **tool-calling agent**:
 *   FE HttpAgent ──POST /agent──▶ this BE ──stream AG-UI events──▶ FE bridge ──▶ MDMA render
 *
 * Uses the MDMA *agent* prompt: the model calls a `generate_mdma` function and puts the document in
 * the tool argument — never in its prose. So MDMA is delivered out-of-band on the AG-UI **CUSTOM**
 * event channel; prose goes on the normal TEXT_MESSAGE channel. Approval gates park the run on an
 * interrupt and the resume turn is fully LLM-driven; `set_state` writes shared state that rendered
 * components hydrate from.
 *
 * Run:  pnpm backend   (reads .env: OPENROUTER_API_KEY, MDMA_MODEL, MDMA_PROFILE)
 */
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { EventType } from '@ag-ui/core';
import { EventEncoder, AGUI_MEDIA_TYPE } from '@ag-ui/encoder';
import { buildSystemPrompt, getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';

const PORT = Number(process.env.PORT ?? 8787);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const MDMA_MODEL = process.env.MDMA_MODEL ?? 'openai/gpt-5.4-mini';
const MDMA_PROFILE = process.env.MDMA_PROFILE ?? 'openai/gpt-5.4-mini';

// Author prompt (MDMA DSL knowledge) composed with the conversational agent tool prompt, plus a
// note about the set_state tool (data the user gives you lives in shared state — the source of
// truth that MDMA components hydrate from).
const SYSTEM_PROMPT = `${buildSystemPrompt({ customPrompt: getAgentToolPromptVariant(MDMA_PROFILE).prompt })}

You also have a \`set_state\` function. MDMA components are headless — their VALUES come from shared state. Whenever the user gives you personal information (name, email, phone, address, preferences), call \`set_state\` with componentId "profile" and the field(s), e.g. { "name": "Marcin", "email": "x@y.com" }. ALWAYS use "profile" for personal info — never a form id. Rendered forms pre-fill automatically from the profile.

To change the VALUE of a field on a form you have ALREADY rendered — e.g. "set severity to high", "pick DEV for environment", "check that box" — call \`set_state\` with THAT form's componentId and just the field(s) you are changing, e.g. { "severity": "high" }. The live form updates in place. Do NOT re-render the form to change a value. For \`select\` fields the value must be the option's \`value\` (e.g. \`high\`), not its label. Re-rendering with \`generate_mdma\` is only for STRUCTURAL changes (adding/removing a field, changing options or type).

Do not restate saved data as prose; just save it and give a one-line acknowledgement.`;

// The function the agent prompt tells the model to call. Its `document` arg IS the MDMA.
const GENERATE_MDMA_TOOL = {
  type: 'function',
  function: {
    name: 'generate_mdma',
    description: 'Build an interactive MDMA document (form, table, approval gate, tasklist, chart, …).',
    parameters: {
      type: 'object',
      properties: { document: { type: 'string', description: 'The complete MDMA markdown document.' } },
      required: ['document'],
    },
  },
};

// Write structured data into shared state — the source of truth that rendered components read from.
const SET_STATE_TOOL = {
  type: 'function',
  function: {
    name: 'set_state',
    description:
      'Save structured data the user gives you so forms pre-fill from it and you can recall it. Call it whenever the user provides information (name, email, preferences, or specific form values).',
    parameters: {
      type: 'object',
      properties: {
        componentId: { type: 'string', description: '"profile" for general user info, or a component/form id.' },
        values: { type: 'object', description: 'field name → value, e.g. { "name": "Marcin", "email": "mar@wp.pl" }' },
      },
      required: ['componentId', 'values'],
    },
  },
};

interface AguiMessageIn {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content?: string;
}
interface ResumeEntry {
  interruptId: string;
  payload?: { kind?: string; decision?: string; componentId?: string; [k: string]: unknown };
}

const F = '```';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function cors(res: ServerResponse): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type, accept');
}
async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
}
/** Ensure the model's document is a fenced ```mdma block so the bridge's containsMdma gate passes. */
function fenceMdma(doc: string): string {
  return /```mdma/.test(doc) ? doc : `${F}mdma\n${doc.trim()}\n${F}`;
}
interface ThreadState {
  /** componentId → current field values (shared state that hydrates forms). `profile` = user info. */
  components: Record<string, Record<string, unknown>>;
  /** componentId → the last MDMA doc rendered for it, so the model can see + update it. */
  docs: Record<string, string>;
}
const threadState = new Map<string, ThreadState>();

function primaryComponentId(doc: string): string | null {
  for (const block of doc.match(/```mdma\b[\s\S]*?```/g) ?? []) {
    if (/type:\s*thinking/.test(block)) continue;
    const id = block.match(/id:\s*([\w-]+)/)?.[1];
    if (id) return id;
  }
  return null;
}

function formHydration(doc: string, profile: { email?: string; name?: string }): { id: string; values: Record<string, unknown> } | null {
  for (const block of doc.match(/```mdma\b[\s\S]*?```/g) ?? []) {
    if (!/type:\s*form/.test(block)) continue;
    const id = block.match(/id:\s*([\w-]+)/)?.[1];
    if (!id) continue;
    const values: Record<string, unknown> = {};
    const fieldRe = /-\s*name:\s*([\w-]+)([\s\S]*?)(?=\n\s*-\s*name:|\n\s*onSubmit:|\n```|$)/g;
    let m: RegExpExecArray | null;
    // biome-ignore lint/suspicious/noAssignInExpressions: standard regex-exec loop
    while ((m = fieldRe.exec(block)) !== null) {
      const [, field, body] = m;
      if (/type:\s*email/.test(body) && profile.email) values[field] = profile.email;
      else if (/^(full[-_]?name|first[-_]?name|name)$/i.test(field) && profile.name) values[field] = profile.name;
    }
    if (Object.keys(values).length > 0) return { id, values };
  }
  return null;
}

interface Decision {
  kind: string;
  componentId?: string;
  decision?: string;
  values?: Record<string, unknown>;
}
/** A resume (gate) or an action message (form/button/tasklist submit) — a user *decision*, not a build request. */
function parseDecision(inMessages: AguiMessageIn[], resume: ResumeEntry[]): Decision | null {
  if (resume.length > 0) {
    const p = resume[0].payload ?? {};
    return { kind: p.kind ?? 'approval', componentId: resume[0].interruptId, decision: p.decision };
  }
  const last = [...inMessages].reverse().find((m) => m.role === 'user');
  if (!last?.content) return null;
  try {
    const j = JSON.parse(last.content) as Decision;
    if (j && typeof j === 'object' && ['action', 'approval', 'integration'].includes(j.kind)) return j;
  } catch {}
  return null;
}

/** Find an approval-gate's component id in emitted MDMA, so we can park the run on it. */
function detectApprovalGate(md: string): string | null {
  for (const block of md.match(/```mdma\b[\s\S]*?```/g) ?? []) {
    if (/type:\s*approval-gate/.test(block)) {
      const id = block.match(/id:\s*([\w-]+)/);
      if (id) return id[1];
    }
  }
  return null;
}

interface Emit {
  mdma: (doc: string) => void; // CUSTOM 'mdma' event (out-of-band MDMA delivery)
  text: (s: string) => Promise<void>; // TEXT_MESSAGE_* (chunked for a streaming feel)
  state: (componentId: string, values: Record<string, unknown>) => void; // write shared state + STATE_SNAPSHOT
  // Agentic activity feed — TOOL_CALL_* events the bridge turns into an activity timeline.
  toolStart: (id: string, name: string) => void;
  toolArgs: (id: string, argsDelta: string) => void;
  toolEnd: (id: string) => void;
  toolResult: (id: string, content: string) => void;
}

interface ORMessage {
  content?: string | null;
  tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>;
}

/** One OpenRouter chat call. Pass `tools` to allow generate_mdma; omit to force a text-only reply. */
async function callOpenRouter(
  messages: Array<Record<string, unknown>>,
  tools?: unknown[],
): Promise<{ ok: true; msg?: ORMessage } | { ok: false; err: string }> {
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:5188',
      'X-Title': 'MDMA temp demo',
    },
    body: JSON.stringify({ model: MDMA_MODEL, messages, ...(tools ? { tools, tool_choice: 'auto' } : {}) }),
  });
  const json = (await resp.json()) as { choices?: Array<{ message?: ORMessage }> };
  if (!resp.ok) return { ok: false, err: `**OpenRouter error ${resp.status}:** ${JSON.stringify(json)}` };
  return { ok: true, msg: json.choices?.[0]?.message };
}

async function runToolLoop(convo: Array<Record<string, unknown>>, emit: Emit): Promise<void> {
  const first = await callOpenRouter(convo, [GENERATE_MDMA_TOOL, SET_STATE_TOOL]);
  if (!first.ok) {
    await emit.text(first.err);
    return;
  }
  const msg = first.msg;
  if (!msg?.tool_calls?.length) {
    if (msg?.content) await emit.text(msg.content);
    return;
  }

  convo.push(msg as Record<string, unknown>);

  for (const tc of msg.tool_calls) {
    if (tc.function?.name !== 'set_state') continue;
    try {
      const { componentId, values } = JSON.parse(tc.function.arguments) as {
        componentId?: string;
        values?: Record<string, unknown>;
      };
      if (componentId && values && typeof values === 'object') emit.state(componentId, values);
    } catch {}
  }

  const seen = new Set<string>();
  for (const tc of msg.tool_calls) {
    const name = tc.function?.name;
    emit.toolStart(tc.id, name ?? 'tool');
    emit.toolArgs(tc.id, tc.function?.arguments ?? '');
    emit.toolEnd(tc.id);

    if (name === 'generate_mdma') {
      let doc = '';
      try {
        doc = (JSON.parse(tc.function.arguments) as { document?: string }).document ?? '';
      } catch {}
      const fenced = doc ? fenceMdma(doc) : '';
      if (fenced && !seen.has(fenced)) {
        seen.add(fenced);
        emit.mdma(fenced);
      }
      emit.toolResult(tc.id, 'Document rendered to the user.');
      convo.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: 'Rendered to the user. Reply with ONE short sentence confirming what you built — no markdown headings, no repeating the document.',
      });
    } else if (name === 'set_state') {
      emit.toolResult(tc.id, 'Saved to shared state.');
      convo.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: 'Saved to shared state. Acknowledge to the user in ONE short, natural sentence. Do NOT output JSON or call any function.',
      });
    } else {
      emit.toolResult(tc.id, 'ok');
      convo.push({ role: 'tool', tool_call_id: tc.id, content: 'ok' });
    }
  }
  const summary = await callOpenRouter(convo);
  if (summary.ok && summary.msg?.content) await emit.text(summary.msg.content);
}

async function handleAgent(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const threadId = (body.threadId as string) ?? randomUUID();
  const runId = (body.runId as string) ?? randomUUID();
  const inMessages = (body.messages as AguiMessageIn[] | undefined) ?? [];
  const resume = (body.resume as ResumeEntry[] | undefined) ?? [];

  const encoder = new EventEncoder({ accept: req.headers.accept });
  const contentType = encoder.getContentType();
  const isProto = contentType === AGUI_MEDIA_TYPE;
  res.writeHead(200, { 'Content-Type': contentType });
  const send = (event: Parameters<EventEncoder['encode']>[0]) =>
    res.write(isProto ? encoder.encodeBinary(event) : encoder.encode(event));

  send({ type: EventType.RUN_STARTED, threadId, runId } as never);

  const stored: ThreadState = threadState.get(threadId) ?? { components: {}, docs: {} };
  threadState.set(threadId, stored);

  const emittedDocs: string[] = [];
  const emit: Emit = {
    mdma: (doc) => {
      emittedDocs.push(doc);
      // Remember the rendered component so the model sees it next turn (MDMA is delivered out-of-band,
      // so it's not in the message history) and can update it instead of inventing a new one.
      const primary = primaryComponentId(doc);
      if (primary) stored.docs[primary] = doc;
      // Seed a generated form's values from the remembered `profile` in state, and emit
      // STATE_SNAPSHOT *before* the document so the bridge hydrates it pre-filled.
      const profile = (stored.components.profile ?? {}) as { email?: string; name?: string };
      const form = formHydration(doc, profile);
      if (form) {
        stored.components[form.id] = { ...(stored.components[form.id] ?? {}), ...form.values };
        send({ type: EventType.STATE_SNAPSHOT, snapshot: stored.components } as never);
      }
      send({ type: EventType.CUSTOM, name: 'mdma', value: { messageId: randomUUID(), markdown: doc } } as never);
    },
    text: async (s) => {
      const messageId = randomUUID();
      send({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' } as never);
      for (let i = 0; i < s.length; i += 24) {
        send({ type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta: s.slice(i, i + 24) } as never);
        await sleep(20);
      }
      send({ type: EventType.TEXT_MESSAGE_END, messageId } as never);
    },
    toolStart: (id, name) => send({ type: EventType.TOOL_CALL_START, toolCallId: id, toolCallName: name } as never),
    toolArgs: (id, argsDelta) => send({ type: EventType.TOOL_CALL_ARGS, toolCallId: id, delta: argsDelta } as never),
    toolEnd: (id) => send({ type: EventType.TOOL_CALL_END, toolCallId: id } as never),
    toolResult: (id, content) =>
      send({ type: EventType.TOOL_CALL_RESULT, messageId: randomUUID(), toolCallId: id, content, role: 'tool' } as never),
    state: (componentId, values) => {
      stored.components[componentId] = { ...(stored.components[componentId] ?? {}), ...values };
      send({ type: EventType.STATE_SNAPSHOT, snapshot: stored.components } as never);
      // When the profile changes, map it onto every already-rendered form's matching fields so those
      // forms hydrate reactively (the bridge pushes state into live components).
      if (componentId === 'profile') {
        const profile = stored.components.profile as { email?: string; name?: string };
        let changed = false;
        for (const doc of Object.values(stored.docs)) {
          const form = formHydration(doc, profile);
          if (form) {
            stored.components[form.id] = { ...(stored.components[form.id] ?? {}), ...form.values };
            changed = true;
          }
        }
        if (changed) send({ type: EventType.STATE_SNAPSHOT, snapshot: stored.components } as never);
      }
    },
  };

  // Inject the remembered shared state so the agent can answer questions about it (e.g. "what's my
  // email?") and pre-fill forms — the state is the agent's memory, not just a client-side hydration.
  const memory = Object.keys(stored.components).length
    ? `\n\nRemembered state for this conversation (JSON, componentId → values). Use it to pre-fill forms and to answer questions about values the user has already given you:\n${JSON.stringify(stored.components)}`
    : '';
  const rendered = Object.keys(stored.docs).length
    ? `\n\nComponents you have ALREADY rendered to the user in this conversation (id → MDMA). To change a field's VALUE on one of these (select an option, fill a field, set severity, etc.), call set_state with that component's id — do NOT re-render. Only call generate_mdma again (with the SAME id, never a near-duplicate new id) for STRUCTURAL changes: adding or removing a field, or changing a field's options or type:\n${Object.values(stored.docs).join('\n\n')}`
    : '';
  const convo: Array<Record<string, unknown>> = [
    { role: 'system', content: SYSTEM_PROMPT + memory + rendered },
    ...inMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content ?? '' })),
  ];
  const decision = parseDecision(inMessages, resume);

  if (!OPENROUTER_API_KEY) {
    await emit.text('Set OPENROUTER_API_KEY in .env to run this example.');
    send({ type: EventType.RUN_FINISHED, threadId, runId } as never);
    res.end();
    return;
  }

  try {
    if (decision) {
      if (decision.componentId) {
        const patch = decision.values && typeof decision.values === 'object' ? decision.values : { status: decision.decision ?? 'done' };
        stored.components[decision.componentId] = { ...(stored.components[decision.componentId] ?? {}), ...patch };
        send({ type: EventType.STATE_SNAPSHOT, snapshot: stored.components } as never);
      }
      convo.push({
        role: 'user',
        content:
          `(The user just ${decision.kind === 'approval' ? `answered the "${decision.componentId}" approval gate: ${decision.decision}` : `submitted the "${decision.componentId}" form with values ${JSON.stringify(decision.values ?? {})}`}. ` +
          `Acknowledge in one short sentence and continue the conversation. Do NOT build or render another component.)`,
      });
      const ack = await callOpenRouter(convo); // no tools → text only
      if (ack.ok && ack.msg?.content) await emit.text(ack.msg.content);
      else if (!ack.ok) await emit.text(ack.err);
      send({ type: EventType.RUN_FINISHED, threadId, runId } as never);
      res.end();
      return;
    }

    await runToolLoop(convo, emit);
  } catch (err) {
    await emit.text(`**backend error:** ${String(err)}`);
  } finally {
    if (!res.writableEnded) {
      const gateId = detectApprovalGate(emittedDocs.join('\n'));
      if (gateId) {
        send({
          type: EventType.RUN_FINISHED,
          threadId,
          runId,
          outcome: { type: 'interrupt', interrupts: [{ id: gateId, reason: 'Approval required before proceeding' }] },
        } as never);
      } else {
        send({ type: EventType.RUN_FINISHED, threadId, runId } as never);
      }
      res.end();
    }
  }
}

const server = createServer((req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204).end();
    return;
  }
  if (req.method === 'GET' && req.url?.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ live: Boolean(OPENROUTER_API_KEY), model: MDMA_MODEL, profile: MDMA_PROFILE }));
    return;
  }
  if (req.method === 'POST' && req.url?.startsWith('/agent')) {
    handleAgent(req, res).catch((err) => {
      console.error('agent error', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    return;
  }
  res.writeHead(404).end();
});

server.listen(PORT, () => {
  console.log(`\n  MDMA AG-UI tool-calling backend on http://localhost:${PORT}`);
  console.log(`  LLM: ${OPENROUTER_API_KEY ? `OpenRouter · ${MDMA_MODEL} · prompt ${MDMA_PROFILE}` : 'no OPENROUTER_API_KEY set — requests will error'}`);
  console.log('  MDMA delivered via CUSTOM events; prose via TEXT_MESSAGE.\n');
});
