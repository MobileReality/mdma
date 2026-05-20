/**
 * MDMA Fixer Prompt — Google Gemini 3.1 Pro Preview Custom Tools variant.
 *
 * The OpenRouter model `google/gemini-3.1-pro-preview-customtools` is a
 * Pro tuning that improves tool/function-call selection. Text generation
 * behavior (which is what the fixer exercises — output a corrected
 * Markdown document, no tool calls) is unchanged from regular Pro, so
 * this file uses the same composition as `gemini-3.1-pro-preview.ts`.
 * If a future eval shows the customtools tuning behaves differently on
 * pure text generation, edit this file independently to diverge.
 *
 * Routing: substring match on `gemini-3.1-pro-preview-customtools`
 * (34 chars) beats the Pro variant's 24-char match for any model id
 * containing this literal.
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

export const MDMA_FIXER_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS = `${OUTPUT_FORMAT_BLOCK}

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
