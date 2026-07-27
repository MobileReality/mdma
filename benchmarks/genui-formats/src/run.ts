/**
 * Generation runner: model x format x scenario x repeat.
 *
 * Every generation is written to disk before it is scored, so the whole
 * benchmark is auditable after the fact and re-scorable without re-spending.
 * The run is resumable: a (model, format, scenario, repeat) already present in
 * generations.jsonl is skipped.
 *
 * Usage:
 *   pnpm bench --rungs small                    # one rung
 *   pnpm bench --models google/gemma-4-26b-a4b-it --k 5
 *   pnpm bench --formats mdma,openui --scenarios contact-form
 *   pnpm bench --rungs small --dry              # print the plan, call nothing
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import { ADAPTERS, ADAPTER_BY_ID, type FormatAdapter } from './adapters/index.js';
import { MODELS, type ModelSpec, type Rung } from './models.js';
import { SCENARIOS, type Scenario } from './scenarios.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS = join(ROOT, 'results');
const RAW = join(RESULTS, 'raw');
const LEDGER = join(RESULTS, 'generations.jsonl');

/** Identical for every format and model — only the system prompt varies. */
const TEMPERATURE = 0.7;
const MAX_TOKENS = 8192;
const CONCURRENCY = 6;

export interface GenerationRecord {
  model: string;
  format: string;
  scenario: string;
  repeat: number;
  output: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  finishReason: string | null;
  error?: string;
}

interface Args {
  rungs: Rung[];
  models: string[];
  formats: string[];
  scenarios: string[];
  k: number;
  dry: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i === -1 ? undefined : argv[i + 1];
  };
  const list = (flag: string): string[] =>
    (get(flag) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

  return {
    rungs: (list('--rungs') as Rung[]) ?? [],
    models: list('--models'),
    formats: list('--formats'),
    scenarios: list('--scenarios'),
    k: Number(get('--k') ?? 5),
    dry: argv.includes('--dry'),
  };
}

function selectModels(args: Args): ModelSpec[] {
  let models = MODELS;
  if (args.rungs.length) models = models.filter((m) => args.rungs.includes(m.rung));
  if (args.models.length) models = models.filter((m) => args.models.includes(m.id));
  return models;
}

function selectFormats(args: Args): FormatAdapter[] {
  if (!args.formats.length || args.formats.includes('all')) return ADAPTERS;
  return args.formats.map((id) => {
    const adapter = ADAPTER_BY_ID[id as FormatAdapter['id']];
    if (!adapter) throw new Error(`unknown format "${id}"`);
    return adapter;
  });
}

function selectScenarios(args: Args): Scenario[] {
  if (!args.scenarios.length) return SCENARIOS;
  return SCENARIOS.filter((s) =>
    args.scenarios.some((f) => s.id === f || s.family === f || s.variant === f),
  );
}

/** Keys already generated, so a re-run resumes instead of re-spending. */
function loadDone(): Set<string> {
  if (!existsSync(LEDGER)) return new Set();
  const done = new Set<string>();
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as GenerationRecord;
      if (!r.error) done.add(`${r.model}|${r.format}|${r.scenario}|${r.repeat}`);
    } catch {
      /* skip malformed ledger line */
    }
  }
  return done;
}

async function generate(
  model: ModelSpec,
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<Omit<GenerationRecord, 'model' | 'format' | 'scenario' | 'repeat'>> {
  const body: Record<string, unknown> = {
    model: model.id,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: TEMPERATURE,
    max_tokens: MAX_TOKENS,
  };

  // Keep reasoning traces out of the content channel — otherwise they corrupt
  // every format's output and we would be measuring the harness, not the format.
  if (model.suppressReasoning) {
    body.reasoning = { exclude: true };
    body.include_reasoning = false;
  }

  const started = Date.now();
  const fail = (error: string) => ({
    output: '',
    promptTokens: 0,
    completionTokens: 0,
    latencyMs: Date.now() - started,
    finishReason: null,
    error,
  });

  // Transient network faults kill a run if left uncaught, and they do NOT only
  // occur on the fetch call: an ECONNRESET on `syscall: read` happens while the
  // response BODY is being streamed, i.e. inside res.json(). Both the request
  // and the body read therefore sit inside the retry, which is the difference
  // between this surviving a socket drop and losing a 270-generation run.
  let lastError = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/MobileReality/mr-mdma',
          'X-Title': 'MDMA generative-UI format benchmark',
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const text = await res.text();
        // 5xx and 429 are worth retrying; 4xx is a request problem that will
        // fail identically every time.
        if (res.status >= 500 || res.status === 429) {
          lastError = `HTTP ${res.status}: ${text.slice(0, 200)}`;
          await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
          continue;
        }
        return fail(`HTTP ${res.status}: ${text.slice(0, 300)}`);
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };

      if (json.error) return fail(json.error.message ?? 'unknown provider error');

      return {
        output: json.choices?.[0]?.message?.content ?? '',
        promptTokens: json.usage?.prompt_tokens ?? 0,
        completionTokens: json.usage?.completion_tokens ?? 0,
        latencyMs: Date.now() - started,
        finishReason: json.choices?.[0]?.finish_reason ?? null,
      };
    } catch (err) {
      lastError = `${(err as Error).name}: ${(err as Error).message}`;
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }

  return fail(`network (4 attempts): ${lastError}`);
}

/** Run `tasks` with a fixed concurrency ceiling. */
async function pool<T>(tasks: (() => Promise<T>)[], limit: number): Promise<void> {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      await tasks[index]();
    }
  });
  await Promise.all(workers);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const models = selectModels(args);
  const formats = selectFormats(args);
  const scenarios = selectScenarios(args);
  const total = models.length * formats.length * scenarios.length * args.k;

  console.log(`\nmodels    ${models.length}  ${models.map((m) => m.label).join(', ')}`);
  console.log(`formats   ${formats.length}  ${formats.map((f) => f.id).join(', ')}`);
  console.log(`scenarios ${scenarios.length}`);
  console.log(`repeats   ${args.k}`);
  console.log(`total     ${total} generations\n`);

  if (args.dry) return;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey)
    throw new Error('OPENROUTER_API_KEY is not set (put it in benchmarks/genui-formats/.env)');

  mkdirSync(RAW, { recursive: true });
  const done = loadDone();
  if (done.size) console.log(`resuming — ${done.size} generation(s) already on disk\n`);

  // Resolve every system prompt once per (format, model): MDMA's varies by model.
  const prompts = new Map<string, string>();
  for (const format of formats) {
    for (const model of models) {
      prompts.set(`${format.id}|${model.id}`, await format.systemPrompt(model.promptSelector));
    }
  }

  const tasks: (() => Promise<void>)[] = [];
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (const model of models) {
    for (const format of formats) {
      for (const scenario of scenarios) {
        for (let repeat = 0; repeat < args.k; repeat++) {
          const key = `${model.id}|${format.id}|${scenario.id}|${repeat}`;
          if (done.has(key)) {
            skipped += 1;
            continue;
          }

          tasks.push(async () => {
            const systemPrompt = prompts.get(`${format.id}|${model.id}`) as string;
            const result = await generate(model, systemPrompt, scenario.prompt, apiKey);

            const record: GenerationRecord = {
              model: model.id,
              format: format.id,
              scenario: scenario.id,
              repeat,
              ...result,
            };

            // Raw output on disk, one file per generation, for hand inspection.
            if (!result.error) {
              const dir = join(RAW, model.id.replace(/\//g, '_'), format.id);
              mkdirSync(dir, { recursive: true });
              const name = `${scenario.id.replace(/\//g, '__')}__k${repeat}.txt`;
              writeFileSync(join(dir, name), result.output, 'utf8');
            } else {
              failed += 1;
            }

            appendFileSync(LEDGER, `${JSON.stringify(record)}\n`, 'utf8');

            completed += 1;
            const pct = ((completed / tasks.length) * 100).toFixed(0);
            const status = result.error ? `ERROR ${result.error.slice(0, 60)}` : 'ok';
            console.log(
              `[${String(completed).padStart(4)}/${tasks.length}] ${pct.padStart(3)}%  ${model.label.padEnd(22)} ${format.id.padEnd(12)} ${scenario.id.padEnd(26)} k${repeat}  ${status}`,
            );
          });
        }
      }
    }
  }

  if (skipped) console.log(`skipping ${skipped} already-done generation(s)\n`);
  console.log(`running ${tasks.length} generation(s) at concurrency ${CONCURRENCY}\n`);

  await pool(tasks, CONCURRENCY);

  console.log(`\ndone — ${completed} generated, ${failed} errored, ${skipped} skipped`);
  console.log(`ledger: ${LEDGER}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
