/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.4 variant.
 *
 * GPT-5.4 is a non-reasoning model, so Markdown headers (used for gpt-5.5)
 * are replaced with a tighter numbered-rule format that works better for
 * instruction-following without extended chain-of-thought.
 *
 * Observed failure modes addressed:
 *   - Over-calling on MDMA capability / syntax questions
 *   - Mentioning `generate_mdma` in prose text without actually calling it
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_4 = `${TOOL_INTRO_BLOCK}

Call it when the user asks to create, build, or update any interactive document (${WHEN_TO_CALL_CASES}).
Do NOT call it for ${WHEN_NOT_TO_CALL_CASES}.

${CALL_RULES_BLOCK}`;
