import type { Emitter } from './events';
import { fenceMdma } from './mdma';
import { type Convo, type ORMessage, callOpenRouter } from './openrouter';
import { type ThreadState, mergeValues } from './state';
/**
 * The agent turn: decide what kind of turn this is, run the model, and narrate it as AG-UI events.
 *
 * A turn is one of two shapes:
 *  - a *decision* — the user answered a gate or submitted a form. Text-only ack, no tools, so the
 *    agent can't mistake the action payload for a request to build another component.
 *  - a *conversation* turn — one tool round (generate_mdma / set_state), then a text-only follow-up.
 *    Deliberately not a full agentic loop: re-entering tools is what used to duplicate forms.
 */
import { AGENT_TOOLS } from './tools';

export interface AguiMessageIn {
  role: 'user' | 'assistant' | 'system' | 'tool' | 'developer';
  content?: string;
}
export interface ResumeEntry {
  interruptId: string;
  payload?: { kind?: string; decision?: string; componentId?: string; [k: string]: unknown };
}
export interface Decision {
  kind: string;
  componentId?: string;
  decision?: string;
  values?: Record<string, unknown>;
}

/** A resume (gate) or an action message (form/button/tasklist submit) — a decision, not a build request. */
export function parseDecision(inMessages: AguiMessageIn[], resume: ResumeEntry[]): Decision | null {
  if (resume.length > 0) {
    const payload = resume[0].payload ?? {};
    return {
      kind: payload.kind ?? 'approval',
      componentId: resume[0].interruptId,
      decision: payload.decision,
    };
  }
  const last = [...inMessages].reverse().find((m) => m.role === 'user');
  if (!last?.content) return null;
  try {
    const parsed = JSON.parse(last.content) as Decision;
    if (
      parsed &&
      typeof parsed === 'object' &&
      ['action', 'approval', 'integration'].includes(parsed.kind)
    ) {
      return parsed;
    }
  } catch {
    // Plain prose, not an action payload — a normal conversation turn.
  }
  return null;
}

/** Build the model conversation for this turn: system prompt + context, then the chat history. */
export function buildConvo(systemPrompt: string, inMessages: AguiMessageIn[]): Convo {
  return [
    { role: 'system', content: systemPrompt },
    ...inMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content ?? '' })),
  ];
}

const RENDERED_RESULT =
  'Rendered to the user. Reply with ONE short sentence confirming what you built — no markdown headings, no repeating the document.';
const SAVED_RESULT =
  'Saved to shared state. Acknowledge to the user in ONE short, natural sentence. Do NOT output JSON or call any function.';

/** Apply every set_state call before rendering, so a generated form sees the values it should show. */
function applyStateCalls(msg: ORMessage, emit: Emitter): void {
  for (const tc of msg.tool_calls ?? []) {
    if (tc.function?.name !== 'set_state') continue;
    try {
      const { componentId, values } = JSON.parse(tc.function.arguments) as {
        componentId?: string;
        values?: Record<string, unknown>;
      };
      if (componentId && values && typeof values === 'object') emit.state(componentId, values);
    } catch {
      // Malformed tool args — skip rather than kill the turn.
    }
  }
}

function documentOf(tc: { function: { arguments: string } }): string {
  try {
    return (JSON.parse(tc.function.arguments) as { document?: string }).document ?? '';
  } catch {
    return '';
  }
}

export async function runToolLoop(convo: Convo, emit: Emitter): Promise<void> {
  const first = await callOpenRouter(convo, AGENT_TOOLS);
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
  applyStateCalls(msg, emit);

  const rendered = new Set<string>();
  for (const tc of msg.tool_calls) {
    const name = tc.function?.name;
    emit.toolStart(tc.id, name ?? 'tool');
    emit.toolArgs(tc.id, tc.function?.arguments ?? '');
    emit.toolEnd(tc.id);

    // `feedback` goes back to the model (it steers the follow-up sentence); `outcome` is what the
    // activity feed shows the user.
    let outcome = 'ok';
    let feedback = 'ok';
    if (name === 'generate_mdma') {
      const doc = documentOf(tc);
      const fenced = doc ? fenceMdma(doc) : '';
      if (fenced && !rendered.has(fenced)) {
        rendered.add(fenced);
        emit.mdma(fenced);
      }
      outcome = 'Document rendered to the user.';
      feedback = RENDERED_RESULT;
    } else if (name === 'set_state') {
      outcome = 'Saved to shared state.';
      feedback = SAVED_RESULT;
    }

    emit.toolResult(tc.id, outcome);
    convo.push({ role: 'tool', tool_call_id: tc.id, content: feedback });
  }

  const summary = await callOpenRouter(convo); // no tools → text only
  if (summary.ok && summary.msg?.content) await emit.text(summary.msg.content);
}

/** The user answered a gate / submitted a form: record it, then acknowledge without building anything. */
export async function runDecision(
  decision: Decision,
  convo: Convo,
  emit: Emitter,
  state: ThreadState,
  sendSnapshot: () => void,
): Promise<void> {
  if (decision.componentId) {
    const patch =
      decision.values && typeof decision.values === 'object'
        ? decision.values
        : { status: decision.decision ?? 'done' };
    mergeValues(state, decision.componentId, patch);
    sendSnapshot();
  }
  const what =
    decision.kind === 'approval'
      ? `answered the "${decision.componentId}" approval gate: ${decision.decision}`
      : `submitted the "${decision.componentId}" form with values ${JSON.stringify(decision.values ?? {})}`;
  convo.push({
    role: 'user',
    content: `(The user just ${what}. Acknowledge in one short sentence and continue the conversation. Do NOT build or render another component.)`,
  });

  const ack = await callOpenRouter(convo); // no tools → text only
  if (ack.ok && ack.msg?.content) await emit.text(ack.msg.content);
  else if (!ack.ok) await emit.text(ack.err);
}
