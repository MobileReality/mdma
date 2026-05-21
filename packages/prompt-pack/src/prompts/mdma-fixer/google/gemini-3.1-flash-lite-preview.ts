/**
 * MDMA Fixer Prompt — Google Gemini 3.1 Flash-Lite (Preview) variant.
 *
 * Composes the baseline + TABLE_KEY_DIRECTION_BLOCK — flash-lite renames
 * columns instead of data keys when resolving column/data key mismatches.
 *
 * Routing: substring match on `gemini-3.1-flash-lite-preview`. The Pro
 * variant filename doesn't appear as a substring of this model id, so
 * the selector picks this file for any model id containing the literal.
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

export const MDMA_FIXER_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW = `${OUTPUT_FORMAT_BLOCK}

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
