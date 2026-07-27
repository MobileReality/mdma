/**
 * Confirm every model in the ladder still exists on OpenRouter, and print its
 * price so the run cost is known before it starts. Run before any benchmark run.
 */

import { MODELS } from './models.js';

interface OrModel {
  id: string;
  context_length?: number;
  pricing?: { prompt?: string; completion?: string };
}

async function main(): Promise<void> {
  const res = await fetch('https://openrouter.ai/api/v1/models');
  if (!res.ok) throw new Error(`OpenRouter model list failed: ${res.status}`);
  const catalog = (await res.json()) as { data: OrModel[] };
  const byId = new Map(catalog.data.map((m) => [m.id, m]));

  let missing = 0;
  console.log('\nid                                  ctx      $/Mtok in   $/Mtok out');
  console.log('-'.repeat(72));

  for (const model of MODELS) {
    const found = byId.get(model.id);
    if (!found) {
      missing += 1;
      console.log(`${model.id.padEnd(36)} MISSING FROM OPENROUTER`);
      continue;
    }
    const inPrice = Number(found.pricing?.prompt ?? 0) * 1_000_000;
    const outPrice = Number(found.pricing?.completion ?? 0) * 1_000_000;
    console.log(
      `${model.id.padEnd(36)}${String(found.context_length ?? '?').padStart(8)}${inPrice.toFixed(2).padStart(12)}${outPrice.toFixed(2).padStart(13)}`,
    );
    if (model.substitutionNote) console.log(`    note: ${model.substitutionNote}`);
  }

  console.log(
    missing === 0 ? '\nAll models resolved.\n' : `\n${missing} model(s) missing — fix models.ts.\n`,
  );
  process.exit(missing === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
