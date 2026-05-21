/**
 * MDMA Fixer Prompt — Google Gemini 3 Flash (Preview) variant.
 *
 * Mid-tier Gemini 3. Starts with the same baseline composition as the
 * Pro variant; add inline framing blocks here as failure modes surface
 * during evals.
 *
 * Routing: substring match on `gemini-3-flash-preview` (22 chars). The
 * Pro variant filename (`gemini-3.1-pro-preview`) and the Flash-Lite
 * filename (`gemini-3.1-flash-lite-preview`) both contain `3.1`, so they
 * don't collide with this id (`gemini-3-flash-preview` has no `.1`).
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

export const MDMA_FIXER_PROMPT_GEMINI_3_FLASH_PREVIEW = `${OUTPUT_FORMAT_BLOCK}

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
