/**
 * MDMA Agent Tool Prompt — xAI Grok 4.5 variant.
 *
 * Decision-tree framing from grok-4.20, plus two eval-driven suppression rules.
 * 4.5 calls correctly when needed (8/8) and defers cleanly to a host app's own
 * tools (coexistence 8/8), but OVER-calls when `generate_mdma` is the only tool:
 * it fired on greetings/acknowledgements (skips 5/7) and on questions about a
 * document it had already produced (multi-turn 7/10).
 *
 * Kept to two short sentences inside the existing "When NOT to call" section
 * rather than new headed blocks — Grok regresses under heavy framing (see
 * grok-4.3.ts: extra framing took that variant from 2 → 8 → 17 failures), so
 * the guidance is added where the model already looks for negative constraints.
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GROK_4_5 = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## Rules for the function call
${CALL_RULES_BLOCK}

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}. If the user greets you, thanks you, praises the result, or signals they are done, call NO tool at all. If they ask a QUESTION about a document you already produced — how it works, what a field does, or what it contained — answer in plain text; only call again when they ask you to CHANGE it.

Questions about MDMA itself — what it can represent, which components exist, how two component types differ, what the spec supports — are answered by DESCRIBING them in words. Do NOT build an example document to demonstrate the answer; explaining is not building.

Default to NOT calling: the message must contain an explicit request to build or change something. If it is a greeting, a question, a clarification, or a comment about work already done, reply in plain text and call nothing.`;
