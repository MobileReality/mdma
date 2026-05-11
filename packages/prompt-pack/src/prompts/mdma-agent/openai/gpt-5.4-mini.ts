/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.4-mini variant.
 *
 * Smaller tier than gpt-5.4 — needs the most explicit framing to avoid
 * two common failure modes:
 *   - Outputting MDMA Markdown in prose instead of calling the function
 *   - Calling the function for conversational / informational messages
 *
 * Uses short, imperative sentences without headers or numbered lists
 * since mini-tier models respond better to direct commands.
 */

import { CALL_RULES_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_4_MINI = `You have a \`generate_mdma\` function. Call it when the user wants a document (${WHEN_TO_CALL_CASES}). Do not call it for ${WHEN_NOT_TO_CALL_CASES}. ${CALL_RULES_BLOCK}`;
