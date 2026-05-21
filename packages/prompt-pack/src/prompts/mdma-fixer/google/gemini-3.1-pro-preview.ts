/**
 * MDMA Fixer Prompt — Google Gemini 3.1 Pro (Preview) variant.
 *
 * Composition (Gemini-native ordering, mirrors the author variant):
 *
 *   OUTPUT_FORMAT_BLOCK (behavioral anchor — top)
 *     + MDMA_FIXER_BASE (the spec / fix rules)
 *     + all MDMA_FIXER_* extensions
 *     + PRESERVE_INPUT_STRUCTURE_BLOCK (negative constraint — end)
 *
 * Why this ordering — Google's Gemini 3 prompting guides distinguish two
 * placement rules:
 *
 * 1. Phil Schmid's Google guide: "Place behavioral constraints and role
 *    definitions in the System Instruction or at the very top of the
 *    prompt to ensure they anchor the model's reasoning process."
 *    → output-format directive at top.
 *
 * 2. Vertex official guide: "negative constraints should be placed at
 *    the end of the instruction."
 *    → preserve-input-structure (a "do NOT add headings/prose/separators"
 *    rule) at the end.
 *
 * 3. "Use either XML-style tagging OR Markdown consistently — mixing them
 *    confuses the model." → framing blocks are Markdown headings, not
 *    XML tags. (OpenAI/Anthropic variants stick with their
 *    vendor-recommended XML/tag scaffolding.)
 *
 * Routing: substring match on `gemini-3.1-pro-preview`. Picks this variant
 * for any model id containing that literal, including
 * `google/gemini-3.1-pro-preview` (dot-form via dot/dash normalization).
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

export const MDMA_FIXER_PROMPT_GEMINI_3_1_PRO_PREVIEW = `${OUTPUT_FORMAT_BLOCK}

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
