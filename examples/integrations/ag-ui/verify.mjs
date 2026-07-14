/**
 * End-to-end check for value-change vs. structural-change routing.
 *
 *   value change  ("set severity to high")  -> agent calls set_state, does NOT re-render
 *   structural    ("add a phone field")     -> agent calls generate_mdma (re-renders in place)
 *
 * Each case runs two turns in one thread: turn 1 renders a component, turn 2 asks to change it.
 * We then assert on the AG-UI event stream (set_state tool + STATE_SNAPSHOT vs. CUSTOM re-render).
 *
 * Makes real LLM calls, so it needs OPENROUTER_API_KEY (loaded from .env like the server).
 * Boots the backend itself if one isn't already listening on :8787.
 *
 *   pnpm verify            # or: node verify.mjs
 */
import { spawn } from 'node:child_process';
import { dirname } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const BE = process.env.BE ?? 'http://localhost:8787';
let rng = 0x2545f4914f6cdd1dn;
function rand() {
  rng = (rng * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
  return (rng >> 17n).toString(36).slice(0, 8);
}

async function health() {
  try {
    const r = await fetch(`${BE}/health`);
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

/** POST /agent and collect the parsed SSE events. */
async function stream(threadId, messages) {
  const res = await fetch(`${BE}/agent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ threadId, messages }),
  });
  const events = [];
  for (const line of (await res.text()).split('\n')) {
    const l = line.trim();
    if (!l.startsWith('data:')) continue;
    try {
      events.push(JSON.parse(l.slice(5)));
    } catch {}
  }
  return events;
}

const digest = (events) => ({
  reRenders: events.filter((e) => e.type === 'CUSTOM').length,
  tools: events.filter((e) => e.type === 'TOOL_CALL_START').map((e) => e.toolCallName),
  snapshot:
    events
      .filter((e) => e.type === 'STATE_SNAPSHOT')
      .map((e) => e.snapshot)
      .pop() ?? {},
  text: events
    .filter((e) => e.type === 'TEXT_MESSAGE_CONTENT')
    .map((e) => e.delta)
    .join(''),
});

/** Run turn 1 (build) then turn 2 (follow-up) in one thread; return the follow-up's digest. */
async function twoTurn(build, followup) {
  const threadId = `verify-${rand()}`;
  const t1 = [{ id: '1', role: 'user', content: build }];
  await stream(threadId, t1);
  const events = await stream(threadId, [
    ...t1,
    { id: '2', role: 'assistant', content: 'Done.' },
    { id: '3', role: 'user', content: followup },
  ]);
  return digest(events);
}

const fieldValue = (snapshot, field) => {
  for (const vals of Object.values(snapshot)) {
    if (vals && typeof vals === 'object' && field in vals) return vals[field];
  }
  return undefined;
};

// Value change: must route to set_state, land in shared state, and NOT re-render.
const VALUE_CASES = [
  {
    name: 'severity -> high',
    build: 'make a bug report form with a severity select (low/medium/high/critical)',
    followup: 'set the severity to high',
    field: 'severity',
    expect: 'high',
  },
  {
    name: 'priority -> low',
    build: 'make a form with a priority select: low, medium, high',
    followup: 'change priority to low',
    field: 'priority',
    expect: 'low',
  },
  {
    name: 'environment -> prod',
    build: 'make a bug report form with a text field named environment',
    followup: 'set the environment to prod',
    field: 'environment',
    expect: 'prod',
  },
];

// Structural change: must still re-render via generate_mdma.
const STRUCTURAL_CASES = [
  {
    name: 'add a field',
    build: 'make a signup form with email and name',
    followup: 'add a phone number field to it',
  },
];

async function run() {
  const results = [];

  for (const c of VALUE_CASES) {
    const d = await twoTurn(c.build, c.followup);
    const value = fieldValue(d.snapshot, c.field);
    const ok = d.reRenders === 0 && String(value) === c.expect;
    results.push(ok);
    console.log(
      `${ok ? 'PASS ✅' : 'FAIL ❌'}  [${c.name}]  re-renders=${d.reRenders} tools=${JSON.stringify(d.tools)} ${c.field}=${JSON.stringify(value)} :: "${d.text.trim().slice(0, 70)}"`,
    );
  }

  for (const c of STRUCTURAL_CASES) {
    const d = await twoTurn(c.build, c.followup);
    const ok = d.reRenders >= 1;
    results.push(ok);
    console.log(
      `${ok ? 'PASS ✅' : 'FAIL ❌'}  [${c.name}]  re-renders=${d.reRenders} tools=${JSON.stringify(d.tools)} (structural -> should re-render)`,
    );
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n${passed}/${results.length} passed`);
  return passed === results.length;
}

async function main() {
  let child = null;
  let info = await health();
  if (!info) {
    console.log('No backend on :8787 — starting one…');
    child = spawn('./node_modules/.bin/tsx', ['--env-file-if-exists=.env', 'server.ts'], {
      cwd: HERE,
      stdio: 'ignore',
    });
    for (let i = 0; i < 20 && !info; i++) {
      await sleep(1000);
      info = await health();
    }
    if (!info) {
      child.kill();
      throw new Error('backend did not come up on :8787');
    }
  }
  if (!info.live) {
    child?.kill();
    throw new Error(
      'backend is up but OPENROUTER_API_KEY is not set — add it to .env (real LLM calls are required)',
    );
  }
  console.log(`Backend live · ${info.model}\n`);

  try {
    const ok = await run();
    process.exitCode = ok ? 0 : 1;
  } finally {
    child?.kill();
  }
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exitCode = 1;
});
