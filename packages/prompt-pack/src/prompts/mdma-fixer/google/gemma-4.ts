/**
 * MDMA Fixer Prompt — Google Gemma 4 variant.
 *
 * Open-weights Gemma 4 (26B-a4b / 31B, via OpenRouter). Shares Gemini's
 * Markdown-over-XML conventions, so it reuses the Gemini `google/_shared.ts`
 * fixer blocks and the same composition as the smallest Gemini tier
 * (`gemini-3.1-flash-lite-preview.ts`): the full baseline plus
 * TABLE_KEY_DIRECTION_BLOCK, since smaller models rename columns instead of
 * data keys when resolving column/data-key mismatches.
 *
 * Routing: substring match on `gemma-4` covers every Gemma 4 model id
 * (26b-a4b / 31b and their `:free` tiers) with a single variant.
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
import {
  OUTPUT_FORMAT_BLOCK,
  PRESERVE_INPUT_STRUCTURE_BLOCK,
  TABLE_KEY_DIRECTION_BLOCK,
} from './_shared.js';

export const MDMA_FIXER_PROMPT_GEMMA_4 = `${OUTPUT_FORMAT_BLOCK}

${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${TABLE_KEY_DIRECTION_BLOCK}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
