/**
 * Adapter verification. Run this before spending a cent on generations.
 *
 * Three checks:
 *   1. every adapter produces a non-trivial system prompt
 *   2. valid fixture passes, corrupted fixture fails, per format
 *   3. cross-validation — each format's valid sample is REJECTED by the other
 *      three validators
 *
 * Check 3 is the important one. If a validator accepts another format's output,
 * it is not discriminating and every number it produces is noise.
 */

import { ADAPTERS } from './adapters/index.js';
import { FIXTURES } from './fixtures.js';

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
