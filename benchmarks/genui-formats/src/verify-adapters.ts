/**
 * Adapter verification. Run this before spending a cent on generations.
 *
 * Checks:
 *   1. every adapter produces a non-trivial system prompt
 *   2. valid fixture passes, corrupted fixture fails, per format
 *   3. cross-validation — each format's valid sample is REJECTED by the other
 *      three validators
 *   4. empty and plain-prose replies never pass
 *   5. no user prompt leaks a format hint
 *
 * Check 3 is the important one. If a validator accepts another format's output,
 * it is not discriminating and every number it produces is noise.
 *
 * Check 5 guards the other half of the fairness contract: the SYSTEM message is
 * each format's own prompt and necessarily describes its output format — that is
 * the artifact under test — but the USER message must stay format-neutral.
 */

import { ADAPTERS } from './adapters/index.js';
import { FIXTURES } from './fixtures.js';
import { SCENARIOS } from './scenarios.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

let failures = 0;

function check(label: string, pass: boolean, detail = ''): void {
  if (!pass) failures += 1;
  const mark = pass ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
  console.log(`  ${mark}  ${label}${detail ? ` ${DIM}${detail}${RESET}` : ''}`);
}

async function main(): Promise<void> {
  console.log('\n=== 1. System prompts ===\n');
  const promptSizes: Record<string, number> = {};

  for (const adapter of ADAPTERS) {
    const prompt = await adapter.systemPrompt('openai:gpt-5.4-mini');
    promptSizes[adapter.id] = prompt.length;
    const approxTokens = Math.round(prompt.length / 4);
    check(
      `${adapter.label.padEnd(14)} prompt built`,
      prompt.length > 500,
      `${prompt.length} chars (~${approxTokens} tok) — ${adapter.promptSource}`,
    );
  }

  console.log('\n=== 2. Valid passes, corrupted fails ===\n');

  for (const adapter of ADAPTERS) {
    const fixture = FIXTURES[adapter.id];
    if (!fixture) {
      check(`${adapter.label} has a fixture`, false);
      continue;
    }

    const good = adapter.validate(fixture.valid);
    check(
      `${adapter.label.padEnd(14)} accepts its valid sample`,
      good.ok,
      good.ok
        ? `${good.componentCount} components, shape=${good.shape}`
        : good.issues.map((i) => `${i.kind}: ${i.message}`).join(' | '),
    );

    const bad = adapter.validate(fixture.corrupted);
    check(
      `${adapter.label.padEnd(14)} rejects its corrupted sample`,
      !bad.ok,
      bad.ok ? `WRONGLY ACCEPTED (${fixture.corruption})` : `${bad.issues[0]?.kind} — ${fixture.corruption}`,
    );
  }

  console.log('\n=== 3. Cross-validation (each validator must reject foreign formats) ===\n');

  for (const adapter of ADAPTERS) {
    for (const [otherId, fixture] of Object.entries(FIXTURES)) {
      if (otherId === adapter.id) continue;
      const result = adapter.validate(fixture.valid);
      check(
        `${adapter.label.padEnd(14)} rejects ${otherId}`,
        !result.ok,
        result.ok ? 'WRONGLY ACCEPTED — validator is not discriminating' : result.issues[0]?.kind,
      );
    }
  }

  console.log('\n=== 4. Empty / prose input must not pass ===\n');

  for (const adapter of ADAPTERS) {
    const empty = adapter.validate('');
    check(`${adapter.label.padEnd(14)} rejects empty output`, !empty.ok);
    const prose = adapter.validate(
      "Sure! I'd be happy to help you build a contact form. What fields would you like to include?",
    );
    check(`${adapter.label.padEnd(14)} rejects a plain prose reply`, !prose.ok, prose.issues[0]?.kind);
  }

  console.log('\n=== 5. User prompts carry no format hints ===\n');

  // The system message is each format's own prompt and of course describes its
  // format — that is what is under test. The USER message must not: a stray
  // "JSON" or a catalog component name would hand one format a head start.
  const BANNED = [
    // format keywords
    'yaml',
    'json',
    'jsonl',
    'dsl',
    'schema',
    'mdma',
    'openui',
    'a2ui',
    'patch',
    // catalog component names from the four formats
    'Stack',
    'Card',
    'Column',
    'Row',
    'TextContent',
    'FormControl',
    'Callout',
    'TextField',
    'updateComponents',
    'updateDataModel',
    // structural field names
    'elements',
    'props',
    'children',
    'onSubmit',
  ];

  let leaks = 0;
  for (const scenario of SCENARIOS) {
    const found = BANNED.filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(scenario.prompt));
    if (found.length) {
      leaks += 1;
      check(`${scenario.id} is hint-free`, false, `leaks: ${found.join(', ')}`);
    }
  }
  check(
    `all ${SCENARIOS.length} user prompts are free of format hints`,
    leaks === 0,
    leaks === 0 ? '' : `${leaks} prompt(s) leak`,
  );

  console.log('\n=== Prompt size comparison ===\n');
  const sorted = Object.entries(promptSizes).sort((a, b) => a[1] - b[1]);
  for (const [id, size] of sorted) {
    console.log(`  ${id.padEnd(14)} ${String(size).padStart(7)} chars  ~${String(Math.round(size / 4)).padStart(6)} tokens`);
  }

  console.log(
    failures === 0
      ? `\n${GREEN}All adapter checks passed.${RESET}\n`
      : `\n${RED}${failures} check(s) failed — do not run the benchmark until these are fixed.${RESET}\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
