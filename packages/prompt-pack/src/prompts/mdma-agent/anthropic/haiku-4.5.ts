/**
 * MDMA Agent Tool Prompt — Anthropic Claude Haiku 4.5 variant.
 *
 * Haiku is the lite/fast tier — same short imperative format as the OpenAI
 * mini variants, which suits smaller models that respond better to direct
 * commands over structured headers or numbered rules.
 */

import { CALL_RULES_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_HAIKU_4_5 = `You have a \`generate_mdma\` tool. Call it when the user wants a document (${WHEN_TO_CALL_CASES}). Do not call it for ${WHEN_NOT_TO_CALL_CASES}. ${CALL_RULES_BLOCK}`;
