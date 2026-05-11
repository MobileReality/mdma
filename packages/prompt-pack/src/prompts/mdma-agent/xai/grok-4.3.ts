/**
 * MDMA Agent Tool Prompt — xAI Grok 4.3 variant.
 *
 * Grok 4.3 is a flagship model with strong reasoning and instruction-following.
 * Uses decision-tree framing with Markdown headers (same approach as the
 * reasoning-tier variants) to prevent over- and under-calling of generate_mdma.
 *
 * xAI uses OpenAI-compatible function calling framing ("function", not "tool").
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GROK_4_3 = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the function call
${CALL_RULES_BLOCK}`;
