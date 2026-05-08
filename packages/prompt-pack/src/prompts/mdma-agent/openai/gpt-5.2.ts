/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.2 variant.
 *
 * Older base tier — sits between the mini tier and gpt-5.4 in capability.
 * Uses the same compact prose format as gpt-5.4 but without the inline
 * case list, which tends to distract smaller models from the core rule.
 */

import { CALL_RULES_BLOCK, TOOL_INTRO_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_2 =
  `${TOOL_INTRO_BLOCK}\n\n` +
  `Call it when the user asks to create, build, or update any interactive document (${WHEN_TO_CALL_CASES}). ` +
  `Do NOT call it for ${WHEN_NOT_TO_CALL_CASES}.\n\n` +
  CALL_RULES_BLOCK;
