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

function matrix(results: Results, pick: (agg: Aggregate) => string, formats: string[]): string {
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
  // 90% of the expected sweep, not 100%: a handful of API errors (timeouts,
  // socket drops) leave a run a few generations short without making it
  // non-comparable. A genuinely partial run — one stopped part-way — falls far
  // below this. Requiring an exact count silently dropped a complete model from
  // the report over 2 network errors.
  const EXPECTED_PER_FORMAT = 18 * 5 * 0.9;
  const isComplete = (modelId: string) =>
    formats.every((f) => {
      const agg = results.aggregates.find((a) => a.model === modelId && a.format === f);
      return agg && agg.generations >= EXPECTED_PER_FORMAT;
    });

  const modelsRun = MODELS.filter(
    (m) => results.aggregates.some((a) => a.model === m.id) && isComplete(m.id),
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
    `${formats.length === 5 ? 'Five' : formats.length === 4 ? 'Four' : String(formats.length)} open-source generative-UI formats, each generated natively from its own published`,
    'prompt and validated by its own validator, across a ladder of models.',
    '',
    '**The question:** given a system prompt you can paste into any LLM, does the model emit',
    'output you can actually render — every time, including on weak models?',
    '',
  );

  md.push(
    `**Formats tested:** ${ADAPTERS.filter((a) => formats.includes(a.id))
      .map((a) => a.label)
      .join(' · ')}`,
  );
  md.push('');
  md.push(
    'Two entries come from the A2UI world and are **not** the same thing:',
    '[`a2ui-project/a2ui`](https://github.com/a2ui-project/a2ui) is the protocol project',
    '(**A2UI** below, using its own Python prompt generator and the standard v0.9 `basic`',
    'catalog, transport format), and [`AGenUI/AGenUI`](https://github.com/AGenUI/AGenUI) is a',
    'third-party native renderer SDK for it (**AGenUI** below, using its shipped Agent Skill).',
    'They score very differently, which is why they are separate columns.',
  );
  md.push('');
  md.push('**Models tested:**');
  md.push('');
  md.push(
    table(
      ['Rung', 'Model', 'Provider id', 'Generations'],
      modelsRun.map((m) => {
        const gens = results.aggregates
          .filter((a) => a.model === m.id)
          .reduce((sum, a) => sum + a.generations, 0);
        return [m.rung, m.label, `\`${m.id}\``, String(gens)];
      }),
    ),
  );
  md.push('');
  md.push(
    `All reached through OpenRouter, ${k} repeats per scenario, temperature 0.7, max_tokens 8192 —`,
    'identical settings for every format and model.',
    '',
  );

  // ---------------------------------------------------------------- setup
  md.push('## Summary — the three questions this benchmark set out to answer');
  md.push('');

  md.push('### 1. How far down the model ladder does each format work?');
  md.push('');
  md.push(
    'Not "does it work on a flagship" — everything works on a flagship. The question is whether a',
    'format still holds up on the cheap, small, open-weights models most products actually want to',
    'run. Measured on the **"every time" rate** — the share of scenarios where all 5 repeats',
    'rendered — because a format that works four times in five is not something you can ship:',
    '',
  );
  md.push(
    table(
      ['Format', 'Opus 5 (flagship)', 'Gemma-4-26B (open weights)', 'Drop'],
      formats.map((f) => {
        const top = results.aggregates.find(
          (a) => a.model === 'anthropic/claude-opus-5' && a.format === f,
        );
        const bottom = results.aggregates.find(
          (a) => a.model === 'google/gemma-4-26b-a4b-it' && a.format === f,
        );
        // A negative drop means the flagship figure is depressed by something
        // other than format reliability (truncation), so a "drop" is not a
        // meaningful reading of that row. Show N/A and asterisk the figure that
        // needs the explanation rather than printing a misleading -Npp.
        const inverted = top && bottom && top.everyTimeRate < bottom.everyTimeRate;
        const drop =
          !top || !bottom
            ? '—'
            : inverted
              ? 'N/A'
              : `${((top.everyTimeRate - bottom.everyTimeRate) * 100).toFixed(1)}pp`;
        return [
          ADAPTERS.find((a) => a.id === f)?.label ?? f,
          top ? `${pct(top.everyTimeRate)}${inverted ? ' \\*' : ''}` : '—',
          bottom ? pct(bottom.everyTimeRate) : '—',
          drop,
        ];
      }),
    ),
  );
  md.push('');
  md.push(
    "\\* **AGenUI's 38.9% on Opus 5 is not a format failure, and no drop can be read from that row.**",
    '52% of its Opus 5 generations exceeded the 8k output ceiling, and a scenario that runs out of',
    'tokens cannot have rendered every time — so the flagship figure is depressed by verbosity, not',
    'by unreliability, which is why the drop is shown as N/A rather than as an apparent improvement',
    'on the weaker model. Its Gemma figure carries the separate validator caveat flagged below:',
    "12.2% under AGenUI's own script.",
    '',
  );

  md.push('### 2. Is any of them built for one model vendor?');
  md.push('');
  md.push(
    'Whether a library is written *for* GPT, or *for* Gemini, and how much work it is to point it',
    'at something else. None of the four hard-requires a vendor — but the defaults, examples and',
    'tuning show who each one was built against:',
    '',
  );
  md.push(
    table(
      ['Format', 'Assumed provider', 'Vendor-specific work', 'Hard requirement?'],
      [
        [
          'MDMA',
          'none',
          'per-model prompt variants for OpenAI, Anthropic, Google, xAI, and its own model',
          'no',
        ],
        [
          'OpenUI Lang',
          '**OpenAI**',
          'scaffold writes `OPENAI_API_KEY`; their own benchmark generates with `gpt-5.2` and counts tokens with the GPT-5 encoder',
          'no — one prompt, no per-vendor tuning',
        ],
        ['json-render', 'none', 'none — one generated prompt for every model', 'no'],
        ['A2UI', 'none', 'none — one generated prompt, no per-vendor tuning', 'no'],
        [
          'AGenUI',
          'none',
          'none — docs say "try a few models and pick the one that fits best"',
          'no',
        ],
      ],
    ),
  );
  md.push('');
  md.push(
    'So the split is: MDMA is the only one that *adapts* to the model, OpenUI is built against a',
    'house vendor without requiring it, and json-render and AGenUI are vendor-neutral and',
    'vendor-indifferent — one prompt, you find out how it lands.',
    '',
  );

  md.push('### 3. Is it really an open protocol — can you paste the prompt into your own model?');
  md.push('');
  md.push(
    'If a project does not hand you a system prompt you can inject into your own LLM, it is a',
    'closed framework you integrate with, not an open protocol you adopt.',
    '',
  );
  md.push(
    table(
      ['Format', 'Prompt you can inject?', 'How you get it'],
      [
        [
          'MDMA',
          '**yes — static text**',
          'versioned string constants; per-model variants; no build step',
        ],
        [
          'OpenUI Lang',
          '**yes — published text**',
          'a committed `system-prompt.txt`, also regenerable from their JS library',
        ],
        [
          'json-render',
          'yes, but **generated**',
          'you must run `catalog.prompt()` from their TypeScript package to produce one',
        ],
        [
          'A2UI',
          'yes, but **generated**',
          'you must run their Python SDK (`a2ui_agent` prompt generator) to produce one',
        ],
        [
          'AGenUI',
          '**no**',
          'ships an Agent Skill with progressive disclosure, not a prompt — we had to flatten it',
        ],
      ],
    ),
  );
  md.push('');
  md.push(
    'MDMA and OpenUI hand you portable text. json-render ties the protocol to a TypeScript runtime',
    '— fine in Node, an obstacle from Python or Go. AGenUI ships no prompt at all, so we assembled',
    "one. (CopilotKit is the same shape and emits un-schema'd HTML, which is why it is not scored.)",
    '',
    'Prompt size matters here — you pay it on every request:',
    '',
  );
  md.push(
    table(
      ['Format', 'Prompt tokens ↓'],
      ADAPTERS.filter((a) => formats.includes(a.id))
        .map((a) => [a.label, String(results.promptSizes[a.id] ?? '—')])
        .sort((x, y) => Number(x[1]) - Number(y[1])),
    ),
  );
  md.push('');

  md.push('## Reading the tables');
  md.push('');
  md.push('Every metric below is marked **↑ higher is better** or **↓ lower is better**.', '');
  md.push(
    table(
      ['Metric', 'Direction', 'What it means', 'Best possible'],
      [
        ['Renderable rate', '**↑ higher**', 'share of generations a renderer could render', '100%'],
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
        ['Efficiency', '**↑ higher**', 'renderable output per 1k output tokens', 'higher'],
        ['Failure counts', '**↓ lower**', 'number of generations in each failure category', '0'],
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
  md.push(
    "> ⚠️ **AGenUI's column is measured on a looser standard than AGenUI's own tooling applies.** Every",
    '> format here is checked for structural renderability, but AGenUI additionally ships an 889-line',
    '> `validate_a2ui.py`, and under *that* script the same generations score 84.2% / 70.0% /',
    '> **12.2%** instead of 100% / 81.1% / 93.3%. The Gemma row is the one to be careful with.',
    "> See [Cross-check: AGenUI's own validator is much stricter than ours](#cross-check-agenuis-own-validator-is-much-stricter-than-ours).",
    '',
  );

  md.push(
    '### Truncation — ↓ lower is better (output that exceeded the shared 8192-token ceiling)',
  );
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

  md.push(
    '## 3. Shape stability — ↑ higher is better (diagnostic only — NOT comparable across formats)',
  );
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
  // Section 7 records a side experiment run outside the main sweep: A2UI's
  // prompt regenerated with include_examples=True, same 18 scenarios x 5
  // repeats on Gemma-4-26B. Those 90 generations are deliberately NOT in
  // results/generations.jsonl — they are not a peer arm and would inflate the
  // run totals. The figures are therefore stated literally here.
  md.push('## 7. Does adding few-shot examples help a weak model? — no');
  md.push('');
  md.push(
    'A2UI is the only format here whose prompt ships **without worked examples** — its generator',
    'makes them opt-in. Every other format includes them by default. To check whether that',
    'asymmetry disadvantaged A2UI, we re-ran the same 18 scenarios x 5 repeats on Gemma-4-26B with',
    '`include_examples=True` and changed nothing else.',
    '',
  );
  md.push(
    table(
      ['Metric', 'schema only (benchmarked)', '+ examples', 'Delta'],
      [
        ['Renderable rate ↑', '81.1%', '61.1%', '-20.0pp'],
        ['"Every time" rate ↑', '44.4%', '27.8%', '-16.7pp'],
        ['Prompt tokens ↓', '10,286', '53,956', '+43,670'],
      ],
    ),
  );
  md.push('');
  md.push(
    '**Examples made it worse.** With the 54k-token prompt, 7 generations produced no',
    '`<a2ui-json>` block at all — the model answered in prose — and parse errors rose from 17 to',
    '27. At this model size the instruction gets lost in the context rather than reinforced.',
    '',
  );

  md.push('## Method and fairness');
  md.push('');
  md.push(
    '- Every format uses **its own published prompt, unmodified**, from its own official artifact',
    '  or prompt-generation API. None of the prompts were written by us.',
    '- Every format is validated by **its own validator** — MDMA by `@mobile-reality/mdma-validator`,',
    '  json-render by `validateSpec()` + `catalog.validate()`, OpenUI by `createParser()` from',
    '  `@openuidev/lang-core`, AGenUI against the shipped `agenui_catalog.json`.',
    '- **Auto-repair is off for every format.** The question is whether the model produced',
    '  renderable output, not whether a repair layer can rescue it. MDMA ships an autofix and it',
    '  is disabled here; enabling it would flatter MDMA against formats with no equivalent.',
    '- One standard for what counts as a failure, applied to all four: **fatal** means the renderer',
    '  produces something broken, blank or missing; **degraded** (a dropped surplus prop, a code',
    '  fence around otherwise-valid payload) is recorded but not counted against the format.',
    '- Identical user prompts, temperature, and token limits across every format and model.',
    "- Each call is exactly two messages. The **system message** is that format's own published",
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
    '- **AGenUI**: ships no injectable system prompt. A search of the pinned tree finds no prompt',
    '  artifact at all — only `skills/a2ui-generation/`, an Agent Skill whose "Read Only What You',
    '  Need" table tells a file-reading agent which `reference/*.md` to load per task, and which',
    '  also expects to run `scripts/validate_a2ui.py`. For a plain chat completion it was flattened',
    '  to `SKILL.md` plus the two docs that table marks **required** for Non-DTO Component mode',
    '  (`component-catalog.md`, `component-design.md`), plus `data-binding.md` — which the table',
    '  lists as *load-on-demand*, not required, but without which the binding-path rules the',
    "  catalog relies on are absent. Including it is our judgement call, and it makes AGenUI's prompt",
    '  larger (and so more expensive) than a strict reading of the table would. A short note was',
    '  appended telling the model it cannot read files or run scripts.',
    '  The adaptation is itself a finding about portability: this format cannot be used through a',
    '  plain chat completion without someone assembling a prompt for it.',
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

  md.push('### What each format is validated by');
  md.push('');
  md.push(
    table(
      ['Format', 'Validated by', 'First-party checker left unused'],
      [
        ['MDMA', '`@mobile-reality/mdma-validator`, autofix off', 'none'],
        [
          'OpenUI Lang',
          '`createParser()` + `meta.errors` / `unresolved` / `orphaned`',
          'none — their exported `validate()` is a form-field rule runner, not a document checker',
        ],
        [
          'json-render',
          '`validateSpec()` (runtime) **and** `catalog.validate()` (strict Zod)',
          'none — remaining exports are field-level validation, a repair helper, a formatter',
        ],
        [
          'A2UI',
          'their own `TransportParser.parse_response()` (schema compilation) via `a2ui-python/`',
          'none',
        ],
      ],
    ),
  );
  md.push('');

  md.push("### Cross-check: AGenUI's own validator is much stricter than ours");
  md.push('');
  md.push(
    'AGenUI ships an 889-line validation script (`skills/a2ui-generation/scripts/validate_a2ui.py`).',
    'Our adapter does **not** use it: it checks structural renderability only, which is the same',
    'standard applied to the other three formats. Theirs additionally enforces a style-key',
    'whitelist, padding/border shorthand formats, per-component required fields, button action',
    'structure, and some design guidance.',
    '',
    'Running their script over all 218 non-truncated AGenUI generations shows how far apart the two',
    'standards are (`pnpm tsx src/crosscheck-agenui.mts` reproduces this):',
    '',
  );
  md.push(
    table(
      ['Model', 'Our validator ↑', 'Their validator ↑', 'Gap'],
      [
        ['Opus 5', '100.0%', '84.2%', '15.8pp'],
        ['GPT-5.6-terra', '81.1%', '70.0%', '11.1pp'],
        ['Gemma-4-26B-A4B', '93.3%', '12.2%', '**81.1pp**'],
      ],
    ),
  );
  md.push('');
  md.push(
    "**AGenUI's numbers in this report are therefore generous to AGenUI**, dramatically so on the",
    'open-weights rung. Read the 93.3% as "structurally renderable", not as "would pass AGenUI\'s own',
    'quality gate".',
    '',
    'We did not adopt their script, because doing so would hold AGenUI to a materially different',
    'standard than the other three formats. Their top failure reasons are mostly style-lint rather',
    'than parse failures — `padding shorthand must use 4 px values` (60), `text-only style key',
    "'color' is not allowed on non-Text component` (39), `root should not set a solid",
    'background-color` (26) — and the equivalent house-style rules were excluded for MDMA too',
    '(`thinking-block`). Some of them do look renderer-level rather than cosmetic, though, so the',
    'true figure for AGenUI sits somewhere between the two columns above rather than at either end.',
    '',
  );

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
    '- Truncation is scored at a fixed 8192-token ceiling. A higher ceiling would move AGenUI and',
    '  json-render numbers; the ceiling is identical for every format, but it is a choice.',
    '- Renderability is not semantic fidelity: a valid document that answers the wrong question',
    '  scores as a pass. The scenarios are simple enough that this is rare, but it is not measured.',
    '- The four validators are not equally calibrated. Each format is checked by its own tooling,',
    "  but AGenUI's first-party script enforces much more than structural renderability, so A2UI's",
    '  figures here are the most generous of the four — see the cross-check section for the size of',
    '  the gap. OpenUI and json-render ship no stricter checker than the ones already used.',
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
