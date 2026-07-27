/**
 * Scoring. Reads results/generations.jsonl, runs each output through its own
 * format's validator, and writes results/results.json.
 *
 * Offline and free — re-run it whenever a validator changes, without
 * regenerating anything.
 *
 * Metrics, in the order the report presents them:
 *   renderableRate  — share of generations a renderer could render
 *   everyTimeRate   — share of (scenario) cells where ALL k repeats rendered.
 *                     This is the "predictable output every time" number.
 *   shapeStability  — share of cells where all k repeats produced the same
 *                     structural shape. Renderable but different every time is
 *                     still a problem if you are building a product on it.
 *   avgOutputTokens — mean completion tokens
 *   efficiency      — renderableRate / avgOutputTokens * 1000
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTER_BY_ID, type FailureKind, type FormatAdapter } from './adapters/index.js';
import { MODELS } from './models.js';
import { SCENARIOS } from './scenarios.js';
import type { GenerationRecord } from './run.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'results', 'generations.jsonl');
const OUT = join(ROOT, 'results', 'results.json');

export interface CellResult {
  model: string;
  format: string;
  scenario: string;
  family: string;
  variant: string;
  repeats: number;
  /** Generations that hit the max_tokens ceiling; excluded from scoring. */
  truncated: number;
  /** Generations actually scored (repeats - truncated). */
  scored: number;
  renderable: number;
  /** true only when every scored repeat rendered, and nothing was truncated. */
  everyTime: boolean;
  /** true when every repeat produced the same structural shape. */
  stableShape: boolean;
  distinctShapes: number;
  avgOutputTokens: number;
  avgPromptTokens: number;
  failures: FailureKind[];
}

export interface Aggregate {
  model: string;
  format: string;
  generations: number;
  /** Share of generations cut off by the shared max_tokens ceiling. */
  truncationRate: number;
  /** Generations scored, i.e. not truncated. */
  scored: number;
  renderableRate: number;
  everyTimeRate: number;
  shapeStability: number;
  avgOutputTokens: number;
  avgPromptTokens: number;
  /** renderable per 1k output tokens */
  efficiency: number;
  failureCounts: Partial<Record<FailureKind, number>>;
}

export interface Results {
  generatedAt: string;
  cells: CellResult[];
  aggregates: Aggregate[];
  promptSizes: Record<string, number>;
  totals: { generations: number; errored: number };
}

function loadRecords(): GenerationRecord[] {
  if (!existsSync(LEDGER)) throw new Error(`no ledger at ${LEDGER} — run \`pnpm bench\` first`);
  const records: GenerationRecord[] = [];
  for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      records.push(JSON.parse(line) as GenerationRecord);
    } catch {
      /* skip malformed line */
    }
  }
  return records;
}

export function score(records: GenerationRecord[]): Results {
  const scenarioById = new Map(SCENARIOS.map((s) => [s.id, s]));
  const errored = records.filter((r) => r.error).length;
  const usable = records.filter((r) => !r.error);

  // group by cell = (model, format, scenario)
  const cellGroups = new Map<string, GenerationRecord[]>();
  for (const record of usable) {
    const key = `${record.model}|${record.format}|${record.scenario}`;
    const group = cellGroups.get(key);
    if (group) group.push(record);
    else cellGroups.set(key, [record]);
  }

  const cells: CellResult[] = [];

  for (const [key, group] of cellGroups) {
    const [model, format, scenario] = key.split('|');
    const adapter = ADAPTER_BY_ID[format as FormatAdapter['id']];
    if (!adapter) continue;

    const shapes: string[] = [];
    const failures: FailureKind[] = [];
    let renderable = 0;
    let truncated = 0;
    let scored = 0;

    for (const record of group) {
      const result = adapter.validate(record.output);

      // A response cut off by the shared max_tokens ceiling tells us the format
      // is verbose, not that the model cannot produce it. Counting it as a
      // format failure would penalise verbose formats for OUR budget choice, so
      // truncated generations are excluded from the renderable denominator and
      // reported as their own metric instead.
      //
      // This matters: at 8192 tokens, A2UI on Opus 5 truncates ~58% of the time.
      // Scored naively that reads as a catastrophic format failure; it is
      // actually a token-budget artifact sitting on top of a real verbosity cost.
      if (record.finishReason === 'length' && !result.ok) {
        truncated += 1;
        failures.push('truncated');
        continue;
      }

      scored += 1;
      for (const issue of result.issues) {
        if (result.ok && issue.kind === 'prose-leakage') continue;
        if (!result.ok) failures.push(issue.kind);
      }

      if (result.ok) {
        renderable += 1;
        shapes.push(result.shape ?? '');
      }
    }

    const meta = scenarioById.get(scenario);
    const distinct = new Set(shapes);

    cells.push({
      model,
      format,
      scenario,
      family: meta?.family ?? '?',
      variant: meta?.variant ?? '?',
      repeats: group.length,
      truncated,
      scored,
      renderable,
      // "Every time" requires a clean sweep of scored repeats AND nothing lost
      // to truncation — a cell where half the attempts ran out of tokens has
      // not demonstrated it works every time.
      everyTime: truncated === 0 && scored > 0 && renderable === scored,
      // Stability is only meaningful when everything rendered.
      stableShape: truncated === 0 && scored > 0 && renderable === scored && distinct.size === 1,
      distinctShapes: distinct.size,
      avgOutputTokens: group.reduce((a, r) => a + r.completionTokens, 0) / group.length,
      avgPromptTokens: group.reduce((a, r) => a + r.promptTokens, 0) / group.length,
      failures,
    });
  }

  // aggregate by (model, format)
  const aggGroups = new Map<string, CellResult[]>();
  for (const cell of cells) {
    const key = `${cell.model}|${cell.format}`;
    const group = aggGroups.get(key);
    if (group) group.push(cell);
    else aggGroups.set(key, [cell]);
  }

  const aggregates: Aggregate[] = [];
  for (const [key, group] of aggGroups) {
    const [model, format] = key.split('|');
    const generations = group.reduce((a, c) => a + c.repeats, 0);
    const truncatedTotal = group.reduce((a, c) => a + c.truncated, 0);
    const scoredTotal = group.reduce((a, c) => a + c.scored, 0);
    const renderable = group.reduce((a, c) => a + c.renderable, 0);
    // Denominator is scored generations, not all generations — truncation is
    // reported separately rather than charged against the format.
    const renderableRate = scoredTotal ? renderable / scoredTotal : 0;
    const avgOutputTokens =
      group.reduce((a, c) => a + c.avgOutputTokens * c.repeats, 0) / (generations || 1);

    const failureCounts: Partial<Record<FailureKind, number>> = {};
    for (const cell of group) {
      for (const kind of cell.failures) failureCounts[kind] = (failureCounts[kind] ?? 0) + 1;
    }

    aggregates.push({
      model,
      format,
      generations,
      truncationRate: generations ? truncatedTotal / generations : 0,
      scored: scoredTotal,
      renderableRate,
      everyTimeRate: group.filter((c) => c.everyTime).length / group.length,
      shapeStability: group.filter((c) => c.stableShape).length / group.length,
      avgOutputTokens,
      avgPromptTokens:
        group.reduce((a, c) => a + c.avgPromptTokens * c.repeats, 0) / (generations || 1),
      efficiency: avgOutputTokens ? (renderableRate / avgOutputTokens) * 1000 : 0,
      failureCounts,
    });
  }

  const promptSizes: Record<string, number> = {};
  for (const agg of aggregates) {
    promptSizes[agg.format] = Math.round(
      Math.max(promptSizes[agg.format] ?? 0, agg.avgPromptTokens),
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    cells,
    aggregates,
    promptSizes,
    totals: { generations: usable.length, errored },
  };
}

function main(): void {
  const records = loadRecords();
  const results = score(records);
  writeFileSync(OUT, JSON.stringify(results, null, 2), 'utf8');

  console.log(`\nscored ${results.totals.generations} generations (${results.totals.errored} errored)\n`);

  const modelLabel = new Map(MODELS.map((m) => [m.id, m.label]));
  const formats = [...new Set(results.aggregates.map((a) => a.format))];

  console.log('renderable rate — share of generations a renderer could render\n');
  const header = ['model'.padEnd(24), ...formats.map((f) => f.padStart(13))].join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const model of MODELS) {
    const row = results.aggregates.filter((a) => a.model === model.id);
    if (!row.length) continue;
    const cells = formats.map((f) => {
      const agg = row.find((a) => a.format === f);
      return agg ? `${(agg.renderableRate * 100).toFixed(1)}%`.padStart(13) : '—'.padStart(13);
    });
    console.log([(modelLabel.get(model.id) ?? model.id).padEnd(24), ...cells].join(''));
  }

  console.log(`\ntruncation rate — hit the shared 8192-token ceiling (excluded from scoring)\n`);
  console.log(header);
  console.log("-".repeat(header.length));
  for (const model of MODELS) {
    const row = results.aggregates.filter((a) => a.model === model.id);
    if (!row.length) continue;
    const cells = formats.map((f) => {
      const agg = row.find((a) => a.format === f);
      return agg ? `${(agg.truncationRate * 100).toFixed(1)}%`.padStart(13) : "—".padStart(13);
    });
    console.log([(modelLabel.get(model.id) ?? model.id).padEnd(24), ...cells].join(""));
  }

  console.log('\n"every time" rate — share of scenarios where ALL k repeats rendered\n');
  console.log(header);
  console.log('-'.repeat(header.length));
  for (const model of MODELS) {
    const row = results.aggregates.filter((a) => a.model === model.id);
    if (!row.length) continue;
    const cells = formats.map((f) => {
      const agg = row.find((a) => a.format === f);
      return agg ? `${(agg.everyTimeRate * 100).toFixed(1)}%`.padStart(13) : '—'.padStart(13);
    });
    console.log([(modelLabel.get(model.id) ?? model.id).padEnd(24), ...cells].join(''));
  }

  console.log(`\nwrote ${OUT}\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
