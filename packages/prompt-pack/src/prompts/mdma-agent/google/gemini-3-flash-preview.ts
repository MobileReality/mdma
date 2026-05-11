/**
 * MDMA Agent Tool Prompt — Google Gemini 3 Flash Preview variant.
 *
 * Flash tier — short imperative format that suits lighter models better
 * than structured headers or numbered rules. Extended negative list
 * (greetings, recap requests) mirrors the fix applied to the flash-lite
 * variant to prevent over-calling on conversational messages.
 */

import { CALL_RULES_BLOCK, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_FLASH_PREVIEW = `You have a \`generate_mdma\` function. Call it ONLY when the user explicitly asks you to create, build, design, or update an interactive document (${WHEN_TO_CALL_CASES}). Do NOT call it for: greetings, questions about MDMA or what it supports, explanations, clarifications, acknowledgements, recap or memory requests, or any conversational reply. ${CALL_RULES_BLOCK}`;
