import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Promptfoo test generator — the MDMA-IL DSL holdout gate (plan §6).
 *
 * Our model takes ONE MDMA-IL DSL intent and returns an MDMA document, so the
 * eval feeds the DSL holdout (the 95 held-out scenarios in DSL form) as the
 * user request and validates the MDMA output (the validate-mdma assertion in
 * the config). This is the "does our model pass" gate.
 *
 * Source: the canonical holdout produced by the dataset pipeline
 * (`gemma/dataset/data/holdout-dsl.jsonl`). That file is gitignored/generated —
 * run `pnpm --filter @mobile-reality/mdma-evals dataset:build` if it's missing.
 * Override the path with OWN_MODEL_HOLDOUT if you keep it elsewhere.
 *
 * Each holdout line is `{ messages: [system, user(DSL), assistant(MDMA)], ... }`.
 * We surface the DSL as `vars.request` and keep the ground-truth MDMA in
 * `vars.expected_mdma` for reference (the gate asserts validity, not equality).
 */
const HOLDOUT_PATH =
  process.env.OWN_MODEL_HOLDOUT ??
  fileURLToPath(new URL('../gemma/dataset/data/holdout-dsl.jsonl', import.meta.url));

export default function () {
  let raw;
  try {
    raw = readFileSync(HOLDOUT_PATH, 'utf8');
  } catch {
    throw new Error(
      `Holdout DSL file not found at ${HOLDOUT_PATH}. Run \`pnpm --filter ` +
        `@mobile-reality/mdma-evals dataset:build\` to generate it, or set OWN_MODEL_HOLDOUT.`,
    );
  }

  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const { messages, scenarioId, domainId, language } = JSON.parse(line);
      const dsl = messages.find((m) => m.role === 'user')?.content ?? '';
      const expected = messages.find((m) => m.role === 'assistant')?.content ?? '';
      return {
        description: scenarioId ?? domainId ?? 'holdout',
        vars: {
          request: dsl,
          expected_mdma: expected,
          domainId,
          language,
        },
      };
    });
}
