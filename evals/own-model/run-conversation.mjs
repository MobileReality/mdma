/**
 * Genuine multi-turn DSL conversation runner for our model.
 *
 * promptfoo's `_conversation` threading (metadata.conversationId) does not
 * populate in this setup, so this runs the conversations directly: it threads
 * the model's OWN outputs turn-by-turn (system + accumulated user-DSL/assistant-
 * MDMA + current DSL), and checks each turn for:
 *   - valid MDMA (validator)
 *   - only the current turn's component type (only-components)
 *   - NO cross-contamination: the output must not re-emit an earlier turn's
 *     component id.
 *
 * Conversations + per-turn expected type are read from tests-conversation.yaml.
 * Serial by construction (turn N needs turn N-1's output). Run from evals/:
 *   node own-model/run-conversation.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { validate } from '@mobile-reality/mdma-validator';
import { AUTHORING_SYSTEM_PROMPT } from './authoring-system-prompt.mjs';

const BASE = process.env.OWN_MODEL_BASE_URL || 'https://REDACTED.modal.run/v1';
const MODEL = (process.env.OWN_MODEL_PROVIDER || 'openai:chat:mdma-26b').split(':').pop();

const here = (p) => fileURLToPath(new URL(p, import.meta.url));
const turns = YAML.parse(readFileSync(here('tests-conversation.yaml'), 'utf8'));

// group turns by conversationId, preserving order
const convs = new Map();
for (const t of turns) {
  const id = t.metadata?.conversationId ?? 'default';
  if (!convs.has(id)) convs.set(id, []);
  const allowed = t.assert?.find((a) => String(a.value).includes('only-components'))?.config?.allowed ?? [];
  convs.get(id).push({
    desc: t.description,
    dsl: String(t.vars.message).trim(),
    allowedType: allowed[0],
    id: (String(t.vars.message).match(/#([a-z0-9-]+)/i) || [])[1],
  });
}

async function gen(messages) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer unused' },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 2048,
      chat_template_kwargs: { enable_thinking: false },
      messages,
    }),
  });
  const j = await res.json();
  if (!j.choices) throw new Error(`HTTP ${res.status}: ${JSON.stringify(j).slice(0, 120)}`);
  return j.choices[0].message.content;
}

function blockTypes(out) {
  return [...out.matchAll(/```mdma\n([\s\S]*?)```/g)]
    .map((m) => (m[1].match(/^\s*type:\s*([a-z-]+)/m) || [])[1])
    .filter(Boolean);
}

let pass = 0;
let total = 0;
console.log(`endpoint ${BASE} · model ${MODEL}\n`);
for (const [cid, ts] of convs) {
  console.log(`=== ${cid} (${ts.length} turns) ===`);
  const messages = [{ role: 'system', content: AUTHORING_SYSTEM_PROMPT }];
  const priorIds = [];
  for (const turn of ts) {
    total++;
    messages.push({ role: 'user', content: turn.dsl });
    let out;
    try {
      out = await gen(messages);
    } catch (e) {
      console.log(`  FAIL ${turn.desc} — ${e.message}`);
      continue;
    }
    messages.push({ role: 'assistant', content: out });

    const v = validate(out, { exclude: ['thinking-block', 'flow-ordering'], autoFix: false });
    const types = blockTypes(out).filter((t) => t !== 'thinking');
    const onlyExpected = types.length > 0 && types.every((t) => t === turn.allowedType);
    const contaminated = priorIds.filter((pid) => new RegExp(`id:\\s*"?${pid}\\b`).test(out));
    const ok = v.ok && onlyExpected && contaminated.length === 0;
    if (ok) pass++;
    const notes = [];
    if (!v.ok)
      notes.push(`invalid: ${v.issues.filter((i) => i.severity === 'error').map((i) => i.ruleId).join(',')}`);
    if (!onlyExpected) notes.push(`emitted: ${types.join(',') || 'none'}; expected ${turn.allowedType}`);
    if (contaminated.length) notes.push(`RE-EMITTED prior: ${contaminated.join(',')}`);
    console.log(`  ${ok ? 'PASS' : 'FAIL'} ${turn.desc}${notes.length ? ` [${notes.join('] [')}]` : ''}`);
    if (turn.id) priorIds.push(turn.id);
  }
}
console.log(`\nTOTAL: ${pass}/${total} turns valid + scoped (no cross-contamination)`);
