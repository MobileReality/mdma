/**
 * MDMA Fixer Prompt — Google Gemini 2.5 Pro variant.
 *
 * Previous-generation Pro (Gemini 3 is current). Starts with the same
 * baseline composition as the Gemini 3.1 Pro fixer variant; add inline
 * framing blocks here as failure modes surface.
 *
 * The reasoning-token leak (visible "Thinking:" prose before the
 * corrected ```mdma block) that affects gemini-3.1-pro-preview is
 * suppressed via the `passthrough.reasoning.exclude: true` body param
 * in `evals/promptfooconfig.fixer.js`. The `isGeminiPro` provider check
 * in that config catches this id too.
 *
 * Routing: substring match on `gemini-2.5-pro`. Gemini 3.x variants
 * contain `3.1` or `3-flash` in their filenames and do not collide.
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

export const MDMA_FIXER_PROMPT_GEMINI_2_5_PRO = `${OUTPUT_FORMAT_BLOCK}

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
