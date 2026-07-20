/**
 * MDMA Agent Tool Prompt — OpenAI GPT-5.6 Sol variant.
 *
 * GPT-5.6 sibling — same decision-tree framing (Markdown headers + explicit
 * call / no-call conditions) as the gpt-5.5 variant, which suits the reasoning
 * tier. sol/terra/luna share this baseline until agent eval data drives a
 * divergence.
 */

import {
  CALL_RULES_BLOCK,
  MODIFY_FOLLOWUP_BLOCK,
  WORKFLOW_INTENT_BLOCK,
  TOOL_INTRO_BLOCK,
  WHEN_NOT_TO_CALL_CASES,
  WHEN_TO_CALL_CASES,
} from './_shared.js';

export const MDMA_AGENT_TOOL_PROMPT_GPT_5_6_SOL = `${TOOL_INTRO_BLOCK.replace('a `generate_mdma` function', '`generate_mdma`, a function that renders interactive MDMA documents')}

## When to call \`generate_mdma\`
Call it whenever the user requests any interactive document, including: ${WHEN_TO_CALL_CASES}.

${MODIFY_FOLLOWUP_BLOCK}

${WORKFLOW_INTENT_BLOCK}

## When NOT to call \`generate_mdma\`
Do not call it for: ${WHEN_NOT_TO_CALL_CASES}.

## Rules for the function call
${CALL_RULES_BLOCK}`;
