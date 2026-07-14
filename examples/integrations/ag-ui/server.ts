/**
 * AG-UI integration example — backend entry point.
 *   FE HttpAgent ──POST /agent──▶ this BE ──stream AG-UI events──▶ FE bridge ──▶ MDMA render
 *
 * This file is only the transport: HTTP routing and the AG-UI run lifecycle (RUN_STARTED →
 * … → RUN_FINISHED, possibly parked on an interrupt). The agent itself lives in ./backend.
 *
 * Run:  pnpm backend   (reads .env: OPENROUTER_API_KEY, MDMA_MODEL)
 */

import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse, createServer } from 'node:http';
import { EventType } from '@ag-ui/core';
import { AGUI_MEDIA_TYPE, EventEncoder } from '@ag-ui/encoder';
import {
  type AguiMessageIn,
  type ResumeEntry,
  buildConvo,
  parseDecision,
  runDecision,
  runToolLoop,
} from './backend/agent';
import { MDMA_MODEL, OPENROUTER_API_KEY, PORT, PROMPT_VARIANT } from './backend/config';
import { type Send, createEmitter } from './backend/events';
import { approvalGateId } from './backend/mdma';
import { systemMessage } from './backend/prompt';
import { getThread } from './backend/state';

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

/** Encode AG-UI events onto the response — SSE, or binary protobuf if the client asks for it. */
function responseSender(req: IncomingMessage, res: ServerResponse): Send {
  const encoder = new EventEncoder({ accept: req.headers.accept });
  const contentType = encoder.getContentType();
  const isProto = contentType === AGUI_MEDIA_TYPE;
  res.writeHead(200, { 'Content-Type': contentType });
  return (event) => {
    res.write(isProto ? encoder.encodeBinary(event as never) : encoder.encode(event as never));
  };
}

async function handleAgent(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const body = await readJson(req);
  const threadId = (body.threadId as string) ?? randomUUID();
  const runId = (body.runId as string) ?? randomUUID();
  const inMessages = (body.messages as AguiMessageIn[] | undefined) ?? [];
  const resume = (body.resume as ResumeEntry[] | undefined) ?? [];

  const send = responseSender(req, res);
  const finish = (outcome?: Record<string, unknown>) => {
    send({ type: EventType.RUN_FINISHED, threadId, runId, ...outcome });
    res.end();
  };

  send({ type: EventType.RUN_STARTED, threadId, runId });

  const state = getThread(threadId);
  const emit = createEmitter(send, state);

  if (!OPENROUTER_API_KEY) {
    await emit.text('Set OPENROUTER_API_KEY in .env to run this example.');
    finish();
    return;
  }

  const convo = buildConvo(systemMessage(state), inMessages);
  const decision = parseDecision(inMessages, resume);

  try {
    if (decision) {
      await runDecision(decision, convo, emit, state, () =>
        send({ type: EventType.STATE_SNAPSHOT, snapshot: state.components }),
      );
      finish();
      return;
    }
    await runToolLoop(convo, emit);
  } catch (err) {
    await emit.text(`**backend error:** ${String(err)}`);
  } finally {
    if (!res.writableEnded) {
      // An approval gate parks the run: the FE resumes it in place with runAgent({ resume }).
      const gateId = approvalGateId(emit.emittedDocs.join('\n'));
      finish(
        gateId
          ? {
              outcome: {
                type: 'interrupt',
                interrupts: [{ id: gateId, reason: 'Approval required before proceeding' }],
              },
            }
          : undefined,
      );
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
    res.end(
      JSON.stringify({
        live: Boolean(OPENROUTER_API_KEY),
        model: MDMA_MODEL,
        promptVariant: PROMPT_VARIANT.id,
      }),
    );
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
  console.log(
    `  LLM: ${OPENROUTER_API_KEY ? `OpenRouter · ${MDMA_MODEL} · prompt variant ${PROMPT_VARIANT.id}` : 'no OPENROUTER_API_KEY set — requests will error'}`,
  );
  console.log('  MDMA delivered via CUSTOM events; prose via TEXT_MESSAGE.\n');
});
