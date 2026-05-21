/**
 * MDMA Fixer Prompt — Google Gemini 2.5 Flash-Lite variant.
 *
 * Previous-generation smallest-tier Flash-Lite. Starts with the same
 * baseline as the Pro variant; add inline framing blocks here as
 * failure modes surface during evals.
 *
 * Routing: substring match on `gemini-2.5-flash-lite` (21 chars) beats
 * the 16-char `gemini-2.5-flash` match for any id containing this
 * literal.
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

export const MDMA_FIXER_PROMPT_GEMINI_2_5_FLASH_LITE = `${OUTPUT_FORMAT_BLOCK}

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
