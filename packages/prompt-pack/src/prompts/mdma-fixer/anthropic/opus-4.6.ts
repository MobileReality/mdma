/**
 * MDMA Fixer Prompt — Anthropic Claude Opus 4.6 variant.
 *
 * Starting baseline mirroring `./opus-4.7.ts`:
 *   MDMA_FIXER_BASE + OUTPUT_FORMAT_BLOCK + all extensions +
 *   PRESERVE_INPUT_STRUCTURE_BLOCK at the end.
 *
 * Add inline framing blocks here as 4.6-specific failure modes surface.
 *
 * Routing note: the longest-substring matcher in `evals/select-prompt.mjs`
 * picks `opus-4.6.ts` over a future generic `opus.ts` for any model id
 * containing the literal `opus-4.6`. The selector also normalizes
 * dot/dash, so `claude-opus-4-6` routes here too.
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
import { OUTPUT_FORMAT_BLOCK, PRESERVE_INPUT_STRUCTURE_BLOCK } from './_shared.js';

export const MDMA_FIXER_PROMPT_OPUS_4_6 = `${MDMA_FIXER_BASE}

${OUTPUT_FORMAT_BLOCK}
${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
