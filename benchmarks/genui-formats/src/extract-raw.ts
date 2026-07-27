/**
 * Rebuild results/raw/ from the ledger.
 *
 * `results/generations.jsonl` is the canonical record — it already holds every
 * output verbatim, so the per-generation text files are derived data and stay
 * out of git. Run this when you want to read outputs by hand or grep across
 * them.
 *
 *   pnpm extract
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { GenerationRecord } from './run.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'results', 'generations.jsonl');
const RAW = join(ROOT, 'results', 'raw');

if (!existsSync(LEDGER)) throw new Error(`no ledger at ${LEDGER}`);

let written = 0;
for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let record: GenerationRecord;
  try {
    record = JSON.parse(line) as GenerationRecord;
  } catch {
    continue;
  }
  if (record.error) continue;

  const dir = join(RAW, record.model.replace(/\//g, '_'), record.format);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${record.scenario.replace(/\//g, '__')}__k${record.repeat}.txt`),
    record.output,
    'utf8',
  );
  written += 1;
}

console.log(`extracted ${written} generations to ${RAW}`);
