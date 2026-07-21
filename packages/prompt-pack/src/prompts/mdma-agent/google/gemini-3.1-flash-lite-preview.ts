/**
 * MDMA Agent Tool Prompt — Google Gemini 3.1 Flash Lite Preview variant.
 *
 * Flash Lite is the smallest/fastest tier and needs the most explicit framing.
 * The base mini format was extended with:
 *   - Stricter call-intent wording ("explicitly asks to create/build/design/update")
 *   - Wider negative list (greetings, recap requests) to cut over-calling
 *   - Other-tools boundary — the coexistence suite showed Flash Lite generating
 *     a document for a process-worded action owned by `send_email` ("our release
 *     process says the on-call engineer gets notified… notify dana@example.com").
 *     Same hijack the nano tiers showed; the prompt never mentioned other tools,
 *     so the model had no rule to defer by.
 */

import { CALL_RULES_BLOCK, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_1_FLASH_LITE_PREVIEW = `You have a \`generate_mdma\` function. Call it ONLY when the user explicitly asks you to create, build, design, or update an interactive document (${WHEN_TO_CALL_CASES}). Do NOT call it for: greetings, questions about MDMA or what it supports, explanations, clarifications, acknowledgements, recap or memory requests, or any conversational reply. If another available tool directly performs the requested action (sending email, scheduling, searching, fetching data), call THAT tool instead — never generate a document in its place, even when the request is phrased as a process or workflow. ${CALL_RULES_BLOCK}`;
