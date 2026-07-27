/** Print validation issues for stored generations. Usage: pnpm tsx src/inspect.ts [format] [scenario-substring] */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTER_BY_ID, type FormatAdapter } from './adapters/index.js';
import type { GenerationRecord } from './run.js';

const LEDGER = join(dirname(fileURLToPath(import.meta.url)), '..', 'results', 'generations.jsonl');
const [fmt, scen] = process.argv.slice(2);
if (!existsSync(LEDGER)) throw new Error('no ledger');

for (const line of readFileSync(LEDGER, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const r = JSON.parse(line) as GenerationRecord;
  if (r.error) continue;
  if (fmt && r.format !== fmt) continue;
  if (scen && !r.scenario.includes(scen)) continue;
  const adapter = ADAPTER_BY_ID[r.format as FormatAdapter['id']];
  const v = adapter.validate(r.output);
  console.log(
    `\n=== ${r.model} | ${r.format} | ${r.scenario} k${r.repeat} | finish=${r.finishReason} | out=${r.completionTokens}tok`,
  );
  console.log(`    ok=${v.ok} components=${v.componentCount}`);
  for (const i of v.issues.slice(0, 12)) console.log(`    - [${i.kind}] ${i.message}`);
}
