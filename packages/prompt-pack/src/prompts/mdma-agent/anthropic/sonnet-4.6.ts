/**
 * MDMA Agent Tool Prompt — Anthropic Claude Sonnet 4.6 variant.
 *
 * Sonnet 4.6 is a highly capable mid-tier model with strong instruction
 * following. Uses the same decision-tree format as the Opus variants —
 * kept as a separate file so eval data can drive divergence if needed.
 */

import { CALL_RULES_BLOCK, TOOL_INTRO_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_SONNET_4_6 =
  `${TOOL_INTRO_BLOCK}\n\n` +
  `## When to call \`generate_mdma\`\n` +
  `Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.\n\n` +
  `## When NOT to call \`generate_mdma\`\n` +
  `Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.\n\n` +
  `## Rules for the tool call\n` +
  CALL_RULES_BLOCK;
