/**
 * MDMA Agent Tool Prompt — Google Gemini 2.5 Pro variant.
 *
 * Gemini 2.5 Pro is a flagship reasoning-capable model — same decision-tree
 * format as the 3.1 Pro variants. Kept as a separate file so eval data can
 * drive divergence if needed.
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_2_5_PRO = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the function call
${CALL_RULES_BLOCK}`;
