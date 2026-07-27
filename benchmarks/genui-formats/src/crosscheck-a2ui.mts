/**
 * Cross-check our A2UI validator against A2UI's OWN validation script.
 *
 * A2UI ships `skills/a2ui-generation/scripts/validate_a2ui.py` (889 lines). Our
 * adapter does not use it — it checks structural renderability only, the same
 * standard applied to the other three formats. Their script additionally
 * enforces a style whitelist, padding/border shorthand formats, per-component
 * required fields, button action structure, and some design guidance
 * ("root should not set a solid background-color").
 *
 * This script runs theirs over every stored A2UI generation so the gap between
 * the two standards is measured rather than assumed. Reported in REPORT.md.
 *
 * Usage:
 *   curl -o /tmp/validate_a2ui.py https://raw.githubusercontent.com/AGenUI/AGenUI/<sha>/skills/a2ui-generation/scripts/validate_a2ui.py
 *   pnpm tsx src/crosscheck-a2ui.mts
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { a2uiAdapter } from './adapters/a2ui.js';
import type { GenerationRecord } from './run.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LEDGER = join(ROOT, 'results', 'generations.jsonl');
const SCRIPT = process.env.A2UI_VALIDATOR ?? '/tmp/validate_a2ui.py';

const records = readFileSync(LEDGER, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as GenerationRecord)
  .filter((r) => r.format === 'a2ui' && !r.error && r.finishReason !== 'length');

const dir = mkdtempSync(join(tmpdir(), 'a2ui-'));
const byModel = new Map<string, { ours: number; theirs: number; n: number }>();
const reasons = new Map<string, number>();

records.forEach((record, i) => {
  const file = join(dir, `g${i}.md`);
  writeFileSync(file, record.output, 'utf8');

  let theirsOk = true;
  let stdout = '';
  try {
    stdout = execFileSync('python3', [SCRIPT, file], { encoding: 'utf8', timeout: 60_000 });
  } catch (err) {
    theirsOk = false;
    stdout = String((err as { stdout?: string }).stdout ?? '');
  }

  const oursOk = a2uiAdapter.validate(record.output).ok;
  const key = record.model.split('/').pop() as string;
  const entry = byModel.get(key) ?? { ours: 0, theirs: 0, n: 0 };
  entry.n += 1;
  if (oursOk) entry.ours += 1;
  if (theirsOk) entry.theirs += 1;
  byModel.set(key, entry);

  if (!theirsOk) {
    for (const line of stdout.split('\n')) {
      if (!line.trim().startsWith('- ')) continue;
      const reason = line.trim().slice(2).split(':').pop()?.trim().slice(0, 62) ?? '';
      reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
    }
  }
});

console.log(`\nA2UI generations cross-checked (non-truncated): ${records.length}\n`);
console.log(
  `${'model'.padEnd(24)}${'ours'.padStart(8)}${'theirs'.padStart(9)}${'gap'.padStart(8)}`,
);
console.log('-'.repeat(49));
for (const [model, e] of byModel) {
  const ours = (100 * e.ours) / e.n;
  const theirs = (100 * e.theirs) / e.n;
  console.log(
    `${model.padEnd(24)}${`${ours.toFixed(1)}%`.padStart(8)}${`${theirs.toFixed(1)}%`.padStart(9)}${`${(ours - theirs).toFixed(1)}pp`.padStart(8)}`,
  );
}

console.log('\ntop failure reasons under THEIR validator:');
for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
  console.log(`  ${String(count).padStart(4)}  ${reason}`);
}
console.log();
