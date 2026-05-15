#!/usr/bin/env node
// Dump failed test cases from the most recent eval result files.
//
// Run after `pnpm eval` / `pnpm eval:custom` / etc. to see which tests failed
// and why. Picks the most recently modified results-*.json file by default,
// or pass a filename: `node scripts/show-failed.mjs results-custom.json`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const cwd = process.cwd();
const arg = process.argv[2];

const files = arg
  ? [resolve(cwd, arg)]
  : readdirSync(cwd)
      .filter((f) => /^results.*\.json$/.test(f))
      .map((f) => ({ f, mtime: statSync(resolve(cwd, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 1)
      .map(({ f }) => resolve(cwd, f));

if (files.length === 0) {
  console.error('No results-*.json files found in current directory.');
  process.exit(1);
}

for (const file of files) {
  console.log(`\n=== ${file.replace(cwd + '/', '')} ===`);
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`Could not parse ${file}: ${err.message}`);
    continue;
  }

  const inner = data.results ?? data;
  const stats = inner.stats ?? {};
  const results = inner.results ?? [];

  const providers = (inner.prompts ?? []).map((p) => p.provider).filter(Boolean);
  if (providers.length) console.log(`Provider(s): ${providers.join(', ')}`);
  if (stats.successes != null) {
    const total = (stats.successes ?? 0) + (stats.failures ?? 0);
    console.log(`Passed: ${stats.successes}/${total}, Failed: ${stats.failures ?? 0}`);
  }

  const fails = results.filter((t) => !t.success);
  if (fails.length === 0) {
    console.log('No failed tests.');
    continue;
  }

  fails.forEach((t, i) => {
    console.log(`\n--- FAIL ${i + 1} ---`);
    const desc = t.description || t.testCase?.description || '';
    if (desc) console.log(`description: ${desc}`);
    const reqOrMsg =
      t.vars?.request || t.vars?.message || JSON.stringify(t.vars ?? {}).slice(0, 200);
    console.log(`input: ${String(reqOrMsg).slice(0, 200).replace(/\n/g, ' ')}`);
    const gr = t.gradingResult ?? {};
    (gr.componentResults ?? [])
      .filter((c) => !c.pass)
      .forEach((c) => console.log(`reason: ${String(c.reason ?? '').slice(0, 300)}`));
    const out = t.response?.output ?? '';
    const m = out.match(/type: thinking[\s\S]{0,400}/);
    if (m) console.log(`thinking: ${m[0].slice(0, 400)}`);
  });
}
