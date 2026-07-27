/**
 * Renders results/results.json into results/REPORT.md.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTERS } from './adapters/index.js';
import { MODELS, RUNGS } from './models.js';
import { EXCLUDED_ASYMMETRIC, FAMILIES } from './scenarios.js';
import type { Aggregate, Results } from './score.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const RESULTS = join(ROOT, 'results', 'results.json');
const OUT = join(ROOT, 'results', 'REPORT.md');

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function table(headers: string[], rows: string[][]): string {
  const sep = headers.map(() => '---');
  return [
    `| ${headers.join(' | ')} |`,
    `| ${sep.join(' | ')} |`,
    ...rows.map((r) => `| ${r.join(' | ')} |`),
  ].join('\n');
}

function matrix(
  results: Results,
  pick: (agg: Aggregate) => string,
  formats: string[],
): string {
  const rows: string[][] = [];
  for (const rung of RUNGS) {
    const models = MODELS.filter((m) => m.rung === rung);
    const present = models.filter((m) => results.aggregates.some((a) => a.model === m.id));
    if (!present.length) continue;
    rows.push([`**${rung}**`, ...formats.map(() => '')]);
    for (const model of present) {
      const cells = formats.map((f) => {
        const agg = results.aggregates.find((a) => a.model === model.id && a.format === f);
        return agg ? pick(agg) : '—';
      });
      rows.push([model.label, ...cells]);
    }
  }
  const labels = formats.map((f) => ADAPTERS.find((a) => a.id === f)?.label ?? f);
  return table(['Model', ...labels], rows);
}

function main(): void {
  const results = JSON.parse(readFileSync(RESULTS, 'utf8')) as Results;
  const formats = ADAPTERS.map((a) => a.id).filter((id) =>
    results.aggregates.some((a) => a.format === id),
  );

  // Only models with a COMPLETE sweep of every format are reported. A model
  // whose run was stopped part-way has a partial, non-comparable row, and
  // publishing it next to complete ones invites a false comparison.
  const EXPECTED_PER_FORMAT = 18 * 5;
  const isComplete = (modelId: string) =>
    formats.every((f) => {
      const agg = results.aggregates.find((a) => a.model === modelId && a.format === f);
      return agg && agg.generations >= EXPECTED_PER_FORMAT;
    });

  const modelsRun = MODELS.filter(
    (m) => results.aggregates.some((a) => a.model === m.id) && isComplete(m.id),
  );
  const partial = MODELS.filter(
    (m) => results.aggregates.some((a) => a.model === m.id) && !isComplete(m.id),
  );
  const completeIds = new Set(modelsRun.map((m) => m.id));
  results.aggregates = results.aggregates.filter((a) => completeIds.has(a.model));
  results.cells = results.cells.filter((c) => completeIds.has(c.model));
  const scenariosRun = new Set(results.cells.map((c) => c.scenario));
  const k = Math.max(...results.cells.map((c) => c.repeats));

  const md: string[] = [];

  md.push('# Generative-UI format reliability benchmark');
  md.push('');
  md.push(
    `_Generated ${results.generatedAt} · ${results.totals.generations} generations · ${results.totals.errored} API errors_`,
  );
  md.push('');
  md.push(
    'Four open-source generative-UI formats, each generated natively from its own published',
    'prompt and validated by its own validator, across a ladder of models.',
    '',
    '**The question:** given a system prompt you can paste into any LLM, does the model emit',
    'output you can actually render — every time, including on weak models?',
    '',
  );

  // ---------------------------------------------------------------- setup
  md.push('## Reading the tables');
  md.push('');
  md.push(
    'Every metric below is marked **↑ higher is better** or **↓ lower is better**.',
    '',
  );
  md.push(
    table(
      ['Metric', 'Direction', 'What it means', 'Best possible'],
      [
        [
          'Renderable rate',
          '**↑ higher**',
          'share of generations a renderer could render',
          '100%',
        ],
        [
          'Truncation rate',
          '**↓ lower**',
          "share of generations that hit the 8k output ceiling — the format didn't fit",
          '0%',
        ],
        [
          '"Every time" rate',
          '**↑ higher**',
          `share of scenarios where all ${k} repeats rendered cleanly`,
          '100%',
        ],
        [
          'Shape stability',
          '**↑ higher**',
          'share of scenarios whose repeats produced identical structure (within-format only)',
          '100%',
        ],
        [
          'Output tokens',
          '**↓ lower**',
          'mean completion tokens — drives cost and time-to-render',
          'fewer',
        ],
        [
          'Prompt tokens',
          '**↓ lower**',
          'system-prompt size, paid on every single request',
          'fewer',
        ],
        [
          'Efficiency',
          '**↑ higher**',
          'renderable output per 1k output tokens',
          'higher',
        ],
        [
          'Failure counts',
          '**↓ lower**',
          'number of generations in each failure category',
          '0',
        ],
      ],
    ),
  );
  md.push('');
  md.push(
    '> Renderable rate and truncation rate are **not** two views of the same thing. Truncated',
    '> generations are removed from the renderable denominator entirely, so a format can show',
    '> 100% renderable and 52% truncated at once — meaning "everything that fit was valid, but',
    '> half of it did not fit".',
    '',
  );

  md.push('## What was run');
  md.push('');
  md.push(
    table(
      ['', 'Value'],
      [
        ['Scenarios', `${scenariosRun.size} (${FAMILIES.length} families x 3 variants)`],
        ['Formats', String(formats.length)],
        ['Models', String(modelsRun.length)],
        ['Repeats per scenario', String(k)],
        ['Total generations', String(results.totals.generations)],
        ['Temperature', '0.7, identical for every format and model'],
        ['Max tokens', '8192, identical'],
      ],
    ),
  );
  md.push('');

  md.push('### System prompts');
  md.push('');
  md.push(
    'Each format uses its own published prompt, unmodified, obtained through its own official',
    'artifact or prompt-generation API.',
    '',
  );
  md.push(
    table(
      ['Format', 'Source', 'Prompt tokens (↓ lower is better)'],
      ADAPTERS.filter((a) => formats.includes(a.id)).map((a) => [
        a.label,
        a.promptSource,
        String(results.promptSizes[a.id] ?? '—'),
      ]),
    ),
  );
  md.push('');

  // ------------------------------------------------------------- headline
  md.push('## 1. Renderable rate — ↑ higher is better');
  md.push('');
  md.push('Share of generations that parse and validate — i.e. that a renderer could render.');
  md.push('');
  md.push(matrix(results, (a) => pct(a.renderableRate), formats));
  md.push('');

  md.push('### Truncation — ↓ lower is better (output that exceeded the shared 8192-token ceiling)');
  md.push('');
  md.push(
    'Truncated generations are **excluded from the renderable rate above** and reported here',
    'instead. A response cut off mid-structure tells us the format is verbose, not that the model',
    'cannot produce it — charging it as a format failure would penalise verbose formats for our',
    'budget choice rather than for anything about their reliability.',
    '',
    'It is still a real cost. Truncation here means: at 8k output tokens, that format did not fit.',
    '',
  );
  md.push(matrix(results, (a) => pct(a.truncationRate), formats));
  md.push('');

  md.push('## 2. "Every time" rate — ↑ higher is better');
  md.push('');
  md.push(
    `Share of scenarios where **all ${k} repeats** rendered. This is the number that matters if`,
    'you are shipping a product: a format that works 4 times in 5 still breaks in production.',
    '',
  );
  md.push(matrix(results, (a) => pct(a.everyTimeRate), formats));
  md.push('');

  md.push('## 3. Shape stability — ↑ higher is better (diagnostic only — NOT comparable across formats)');
  md.push('');
  md.push(
    `Share of scenarios where all ${k} repeats produced the same component structure.`,
    '',
    '> **Read down a column, never across a row.** The structural fingerprint has different',
    '> granularity in each format, so cross-format comparison here is meaningless. An MDMA',
    "> document's shape is one or two component types (`form`); a json-render spec's is eight to",
    '> sixteen nested elements including every `Stack` and `Card` wrapper. A coarser fingerprint is',
    '> trivially more stable. This is the layout-primitive asymmetry that the scored corpus',
    '> excludes, reappearing as a measurement artifact.',
    '>',
    '> It is still useful *within* a format — it shows how much a given format wobbles as models',
    '> get weaker — which is why it is kept rather than deleted.',
    '',
  );
  md.push(matrix(results, (a) => pct(a.shapeStability), formats));
  md.push('');

  // ----------------------------------------------------------- efficiency
  md.push('## 4. Output tokens (↓ lower is better) and efficiency (↑ higher is better)');
  md.push('');
  md.push(
    'Efficiency is `renderable rate / avg output tokens x 1000` — renderable output per 1k tokens.',
    'Cheap output nobody can render is not cheap.',
    '',
  );
  md.push('**Mean output tokens — ↓ lower is better:**');
  md.push('');
  md.push(matrix(results, (a) => a.avgOutputTokens.toFixed(0), formats));
  md.push('');
  md.push('**Efficiency — ↑ higher is better (renderable output per 1k output tokens):**');
  md.push('');
  md.push(matrix(results, (a) => a.efficiency.toFixed(2), formats));
  md.push('');

  // -------------------------------------------------------------- failures
  md.push('## 5. Failure taxonomy — ↓ lower is better (0 is perfect)');
  md.push('');
  const kinds = [
    ...new Set(results.aggregates.flatMap((a) => Object.keys(a.failureCounts))),
  ].sort();
  md.push(
    table(
      ['Format', ...kinds],
      formats.map((f) => {
        const aggs = results.aggregates.filter((a) => a.format === f);
        return [
          ADAPTERS.find((a) => a.id === f)?.label ?? f,
          ...kinds.map((kind) =>
            String(
              aggs.reduce(
                (sum, a) => sum + (a.failureCounts[kind as keyof typeof a.failureCounts] ?? 0),
                0,
              ),
            ),
          ),
        ];
      }),
    ),
  );
  md.push('');

  // --------------------------------------------------------- by scenario
  md.push('## 6. Renderable rate by scenario family — ↑ higher is better');
  md.push('');
  const familyRows: string[][] = [];
  for (const family of FAMILIES) {
    const cells = formats.map((f) => {
      const group = results.cells.filter((c) => c.family === family && c.format === f);
      if (!group.length) return '—';
      const gen = group.reduce((a, c) => a + c.repeats, 0);
      const ok = group.reduce((a, c) => a + c.renderable, 0);
      return pct(gen ? ok / gen : 0);
    });
    familyRows.push([family, ...cells]);
  }
  md.push(
    table(
      ['Family', ...formats.map((f) => ADAPTERS.find((a) => a.id === f)?.label ?? f)],
      familyRows,
    ),
  );
  md.push('');

  md.push('**By variant** — the adversarial variant is where formats separate:');
  md.push('');
  const variantRows: string[][] = [];
  for (const variant of ['minimal', 'realistic', 'adversarial']) {
    const cells = formats.map((f) => {
      const group = results.cells.filter((c) => c.variant === variant && c.format === f);
      if (!group.length) return '—';
      const gen = group.reduce((a, c) => a + c.repeats, 0);
      const ok = group.reduce((a, c) => a + c.renderable, 0);
      return pct(gen ? ok / gen : 0);
    });
    variantRows.push([variant, ...cells]);
  }
  md.push(
    table(
      ['Variant', ...formats.map((f) => ADAPTERS.find((a) => a.id === f)?.label ?? f)],
      variantRows,
    ),
  );
  md.push('');

  // -------------------------------------------------------------- method
  md.push('## Method and fairness');
  md.push('');
  md.push(
    '- Every format uses **its own published prompt, unmodified**, from its own official artifact',
    '  or prompt-generation API. None of the prompts were written by us.',
    '- Every format is validated by **its own validator** — MDMA by `@mobile-reality/mdma-validator`,',
    '  json-render by `validateSpec()` + `catalog.validate()`, OpenUI by `createParser()` from',
    '  `@openuidev/lang-core`, A2UI against the shipped `agenui_catalog.json`.',
    '- **Auto-repair is off for every format.** The question is whether the model produced',
    '  renderable output, not whether a repair layer can rescue it. MDMA ships an autofix and it',
    '  is disabled here; enabling it would flatter MDMA against formats with no equivalent.',
    '- One standard for what counts as a failure, applied to all four: **fatal** means the renderer',
    '  produces something broken, blank or missing; **degraded** (a dropped surplus prop, a code',
    '  fence around otherwise-valid payload) is recorded but not counted against the format.',
    '- Identical user prompts, temperature, and token limits across every format and model.',
    '- Each call is exactly two messages. The **system message** is that format\'s own published',
    '  prompt, which of course describes its output format in full — component signatures, syntax',
    '  rules, worked examples. That is the thing under test. The **user message** is the scenario',
    '  text, byte-identical across all four formats and written in plain natural language with',
    '  **no format hints**: no YAML, no JSON, no catalog component names, nothing that would give',
    '  one format a head start over another.',
    '- Every raw generation is preserved verbatim in `results/generations.jsonl`, so any number here',
    '  can be audited or re-scored offline without regenerating anything (`pnpm extract` expands it',
    '  into one file per generation).',
    '',
  );

  md.push('### Adjustments made, and why');
  md.push('');
  md.push(
    '- **json-render**: the shipped shadcn catalog has no chart component, while the other three',
    '  ship one. A `Chart` component was added through their own `defineCatalog` API, with a prop',
    '  shape no richer than the others, so the chart family is not an automatic zero for a reason',
    '  unrelated to format reliability.',
    '- **json-render**: `catalog.validate()` (strict Zod) requires `children` on every element, but',
    '  their own runtime `validateSpec()` does not and the renderer renders without it. `children`',
    '  is defaulted to `[]` before the strict check, so we measure the renderer rather than the',
    '  type definition. Without this json-render fails on every leaf element.',
    '- **A2UI**: ships no injectable system prompt — it ships an Agent Skill with progressive',
    '  disclosure that tells a file-reading agent to load `reference/*.md` on demand. For a plain',
    '  chat completion it was flattened to `SKILL.md` + the reference docs its own routing table',
    '  marks required for Non-DTO Component mode, plus a short note telling the model it cannot',
    '  read files. This is a real adaptation and is itself a finding about portability.',
    '',
  );

  const notes = modelsRun.filter((m) => m.substitutionNote || m.mdmaPromptFallback);
  if (notes.length) {
    md.push('### Per-model notes');
    md.push('');
    md.push(
      table(
        ['Model', 'Note'],
        notes.map((m) => [
          m.label,
          [
            m.substitutionNote,
            m.mdmaPromptFallback
              ? 'prompt-pack has no author variant for this model, so MDMA runs its generic prompt here — what an integrator gets today, but not MDMA at its best.'
              : '',
          ]
            .filter(Boolean)
            .join(' '),
        ]),
      ),
    );
    md.push('');
  }

  md.push('### Scenarios excluded as asymmetric');
  md.push('');
  md.push(
    'These were deliberately left out of the scored corpus because they are natively expressible',
    'in some formats and structurally impossible in others. Including them in either direction',
    'would rig the result.',
    '',
  );
  md.push(
    table(
      ['Prompt', 'Why excluded', 'Would favour'],
      EXCLUDED_ASYMMETRIC.map((e) => [e.prompt, e.reason, e.favours]),
    ),
  );
  md.push('');

  md.push('### Limitations');
  md.push('');
  md.push(
    `- ${k} repeats per cell detects gross flakiness, not rare intermittent failures.`,
    '- Shape stability (section 3) is not comparable across formats — see the note there.',
    '- Only two rungs were run (flagship and open-weights). The mid rung is unmeasured, so the',
    '  shape of the degradation curve between them is an inference, not a measurement.',
    ...(partial.length
      ? [
          `- ${partial.map((m) => m.label).join(', ')} ${partial.length === 1 ? 'was' : 'were'} started but not completed, and ${partial.length === 1 ? 'is' : 'are'} excluded entirely — partial rows are not comparable.`,
        ]
      : []),
    '- Truncation is scored at a fixed 8192-token ceiling. A higher ceiling would move A2UI and',
    '  json-render numbers; the ceiling is identical for every format, but it is a choice.',
    '- Renderability is not semantic fidelity: a valid document that answers the wrong question',
    '  scores as a pass. The scenarios are simple enough that this is rare, but it is not measured.',
    '- CopilotKit OpenGenerativeUI is excluded from the quantitative comparison: it emits',
    '  un-schema\'d HTML/CSS/JS, so there is no validator to score against.',
    '- Results are a snapshot against pinned upstream commits (see `vendor/PINS.txt`). These',
    '  projects move weekly.',
    '',
  );

  md.push('### Reproducing');
  md.push('');
  md.push('```bash');
  md.push('pnpm verify     # adapter smoke test + cross-validation');
  md.push('pnpm models     # confirm model ids and pricing');
  md.push('pnpm bench --rungs small');
  md.push('pnpm score');
  md.push('pnpm report');
  md.push('```');
  md.push('');

  writeFileSync(OUT, md.join('\n'), 'utf8');
  console.log(`wrote ${OUT}`);
}

main();
