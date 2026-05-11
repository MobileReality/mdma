/**
 * MDMA Agent Tool Prompt — Anthropic Claude Opus 4.7 variant.
 *
 * Opus 4.7 is Anthropic's flagship reasoning model and handles nuanced
 * conditional logic well. We use a decision-tree format with Markdown headers
 * (matching the gpt-5.5 style) to be explicit about the two failure modes:
 *
 *   - Over-calling: model calls `generate_mdma` for informational questions
 *     ("What components does MDMA support?")
 *   - Under-calling: model outputs MDMA as prose instead of using the tool
 *
 * Claude-native phrasing ("tool", not "function") is used throughout.
 */

import {
  CALL_RULES_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_OPUS_4_7 = `${TOOL_INTRO_BLOCK}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the tool call
${CALL_RULES_BLOCK}`;
