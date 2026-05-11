/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5-mini variant.
 *
 * Mini tier of GPT-5 — same short imperative format as gpt-5.4-mini,
 * which suits smaller models that respond better to direct commands.
 * Reserved as a separate file so eval data can drive divergence if needed.
 */

import { MDMA_AGENT_TOOL_PROMPT_GPT_5_4_MINI } from './gpt-5.4-mini.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_MINI = MDMA_AGENT_TOOL_PROMPT_GPT_5_4_MINI;
