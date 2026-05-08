/**
 * MDMA Agent Tool Prompt — Google Gemini 3 Flash Preview variant.
 *
 * Flash tier — short imperative format that suits lighter models better
 * than structured headers or numbered rules. Kept as a separate file so
 * eval data can drive divergence from the 3.1 flash variants if needed.
 */

import { CALL_RULES_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_FLASH_PREVIEW =
  'You have a `generate_mdma` function. ' +
  `Call it when the user wants a document (${WHEN_TO_CALL_CASES}). ` +
  `Do not call it for ${WHEN_NOT_TO_CALL_CASES}. ` +
  CALL_RULES_BLOCK;
