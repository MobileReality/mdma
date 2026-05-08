/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.5 variant.
 *
 * GPT-5.5 is a reasoning model that handles nuanced conditional logic well,
 * so we provide a fully explicit decision tree with Markdown headers rather
 * than prose paragraphs. This eliminates the two common failure modes:
 *
 *   - Over-calling: model calls `generate_mdma` for informational questions
 *     about MDMA ("What kind of documents can MDMA represent?")
 *   - Under-calling: model outputs MDMA as prose instead of using the tool
 *
 * Eval baseline: 10/10 on the guidance suite with this variant.
 */

import { CALL_RULES_BLOCK, TOOL_INTRO_BLOCK, WHEN_NOT_TO_CALL_CASES, WHEN_TO_CALL_CASES } from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_5 =
  `${TOOL_INTRO_BLOCK.replace('a `generate_mdma` function', '`generate_mdma`, a function that renders interactive MDMA documents')}\n\n` +
  `## When to call \`generate_mdma\`\n` +
  `Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.\n\n` +
  `## When NOT to call \`generate_mdma\`\n` +
  `Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.\n\n` +
  `## Rules for the function call\n` +
  CALL_RULES_BLOCK;
