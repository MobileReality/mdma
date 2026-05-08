/**
 * MDMA Agent Tool Prompt — Google Gemini 3.1 Pro Preview (custom tools) variant.
 *
 * Same decision-tree format as the base gemini-3.1-pro-preview variant,
 * targeting the custom-tools configuration of this model. Kept as a separate
 * file so eval data can drive divergence from the base variant if needed.
 */

import { CALL_RULES_BLOCK, TOOL_INTRO_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_PRO_PREVIEW_CUSTOMTOOLS =
  `${TOOL_INTRO_BLOCK}\n\n` +
  `## When to call \`generate_mdma\`\n` +
  `Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.\n\n` +
  `## When NOT to call \`generate_mdma\`\n` +
  `Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.\n\n` +
  `## Rules for the function call\n` +
  CALL_RULES_BLOCK;
