/**
 * MDMA Agent Tool Prompt — Google Gemini 3.5 Flash variant.
 *
 * Flash tier — short imperative format (same as gemini-3-flash-preview) with
 * the extended negative list (greetings, recap requests) to prevent
 * over-calling on conversational messages.
 *
 * Two eval-driven additions beyond the base flash format:
 *   - Other-tools / acknowledgement boundary — the coexistence suite showed
 *     Flash firing `generate_mdma` on a bare "thanks"; this also took its
 *     single-turn guidance score from 14/15 to 15/15.
 *   - Question-vs-change boundary — on the multi-turn suite Flash re-generated
 *     the document when the user merely ASKED about it ("what does sensitive
 *     do?", "how does the approval gate decide who can approve?"), conflating a
 *     question about a document with a request to change it.
 */

import { CALL_RULES_BLOCK, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GEMINI_3_5_FLASH = `You have a \`generate_mdma\` function. Call it ONLY when the user explicitly asks you to create, build, design, or update an interactive document (${WHEN_TO_CALL_CASES}). Do NOT call it for: greetings, questions about MDMA or what it supports, explanations, clarifications, acknowledgements, recap or memory requests, or any conversational reply. If the user just thanks you or says they are done, call NO tool at all. If another available tool directly performs the requested action (sending email, scheduling, searching, fetching data), call THAT tool instead — never generate a document in its place. If the user asks a QUESTION about a document you already produced — how it works, what a field or setting does, why you chose something, or what it contained — answer in plain text and do NOT call the function again. That includes recalling, listing, or summarising a previous document's fields: describe them in words rather than regenerating it. Only call the function when they ask you to CHANGE the document. ${CALL_RULES_BLOCK}`;
