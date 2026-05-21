/**
 * MDMA Fixer Prompt — xAI Grok 4.3 variant.
 *
 * Minimal composition by design. The author variant's docblock explains
 * the rationale at length: Grok 4.3 regresses when extra framing is
 * stacked on top of the base prompt — top-anchored OUTPUT_FORMAT_BLOCK
 * caused "draft-then-revise" behavior, and an explicit "no preamble"
 * block tripled failures relative to no framing at all. Grok's own
 * community guidance: "responds unpredictably to long, heavily
 * instrumented prompt headers."
 *
 * Start with just MDMA_FIXER_BASE + extensions. Only add inline framing
 * blocks if a specific failure mode is observed AND empirically benefits
 * from the block (regression-check both directions when adding).
 *
 * Routing: substring match on `grok-4.3` (8 chars). The 4.20 variant
 * (`grok-4.20`, 9 chars) wins for ids containing `4.20`; `grok-4.3`
 * doesn't substring-match `4.20`, so no collision either way.
 */

import {
  MDMA_FIXER_APPROVAL,
  MDMA_FIXER_BASE,
  MDMA_FIXER_BINDINGS,
  MDMA_FIXER_EXAMPLES,
  MDMA_FIXER_FLOW,
  MDMA_FIXER_FORMS,
  MDMA_FIXER_PII,
  MDMA_FIXER_STRUCTURE,
  MDMA_FIXER_TABLES_CHARTS,
} from '../_shared.js';

export const MDMA_FIXER_PROMPT_GROK_4_3 = `${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}`;
