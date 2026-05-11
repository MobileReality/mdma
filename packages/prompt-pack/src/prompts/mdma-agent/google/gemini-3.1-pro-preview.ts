/**
 * MDMA Agent Tool Prompt — Google Gemini 3.1 Pro Preview variant.
 *
 * Gemini 3.1 Pro is a flagship reasoning-capable model that handles
 * structured conditional logic well. Uses a decision-tree format with
 * Markdown headers to be explicit about the two common failure modes:
 *
 *   - Over-calling: model calls `generate_mdma` for informational questions
 *     ("What components does MDMA support?")
 *   - Under-calling: model outputs MDMA as prose instead of calling the function
 *
 * Google function-calling framing ("function", not "tool") is used throughout.
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the function call
${CALL_RULES_BLOCK}`;
