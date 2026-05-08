/**
 * MDMA Agent Tool Prompt — xAI Grok 4.20 variant.
 *
 * Same decision-tree framing as grok-4.3 — both are flagship-tier models
 * with strong reasoning and instruction-following. Kept as a separate file
 * so eval data can drive divergence if needed.
 */

import { CALL_RULES_BLOCK, TOOL_INTRO_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GROK_4_20 =
  `${TOOL_INTRO_BLOCK}\n\n` +
  `## When to call \`generate_mdma\`\n` +
  `Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.\n\n` +
  `## When NOT to call \`generate_mdma\`\n` +
  `Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.\n\n` +
  `## Rules for the function call\n` +
  CALL_RULES_BLOCK;
