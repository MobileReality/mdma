/**
 * MDMA Fixer Prompt — Google Gemini 2.5 Flash variant.
 *
 * Previous-generation mid-tier Flash. Starts with the same baseline as
 * the Pro variant; add inline framing blocks here as failure modes
 * surface.
 *
 * Routing: substring match on `gemini-2.5-flash`. Beats the Pro 2.5
 * variant's 14-char `gemini-2.5-pro` match for any id containing this
 * literal. The flash-lite variant (`gemini-2.5-flash-lite`, longer) wins
 * over this one for `*-flash-lite-*` ids.
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

export const MDMA_FIXER_PROMPT_GEMINI_2_5_FLASH = `${OUTPUT_FORMAT_BLOCK}

${MDMA_FIXER_BASE}

${MDMA_FIXER_STRUCTURE}
${MDMA_FIXER_BINDINGS}
${MDMA_FIXER_PII}
${MDMA_FIXER_FORMS}
${MDMA_FIXER_TABLES_CHARTS}
${MDMA_FIXER_FLOW}
${MDMA_FIXER_APPROVAL}
${MDMA_FIXER_EXAMPLES}

${PRESERVE_INPUT_STRUCTURE_BLOCK}`;
