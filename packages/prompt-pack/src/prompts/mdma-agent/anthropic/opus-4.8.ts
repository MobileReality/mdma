/**
 * MDMA Agent Tool Prompt — Anthropic Claude Opus 4.8 variant.
 *
 * Same decision-tree framing (Markdown headers, Claude-native "tool" phrasing)
 * as opus-4.7 — flagship reasoning tier. Reserved as its own file for
 * eval-driven divergence.
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_OPUS_4_8 = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the tool call
${CALL_RULES_BLOCK}`;
