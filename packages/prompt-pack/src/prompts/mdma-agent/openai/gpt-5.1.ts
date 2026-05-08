/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.1 variant.
 *
 * Same framing as gpt-5.2 — older base tier with similar instruction-following
 * characteristics. Reserved as a separate file so eval data can drive
 * divergence if needed.
 */

import { MDMA_AGENT_TOOL_PROMPT_GPT_5_2 } from './gpt-5.2.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_1 = MDMA_AGENT_TOOL_PROMPT_GPT_5_2;
