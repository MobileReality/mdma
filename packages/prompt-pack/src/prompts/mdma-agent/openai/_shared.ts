/**
 * Shared building blocks for MDMA Agent Tool Prompt — OpenAI variants.
 *
 * Each gpt-5.x variant composes from these blocks. The `_` prefix is
 * recognised by `evals/select-prompt.mjs` and skipped during variant discovery.
 *
 * Variant matrix:
 *
 *   openai (generic)   TOOL_INTRO_BLOCK + WHEN_TO_CALL_BLOCK + WHEN_NOT_TO_CALL_BLOCK + CALL_RULES_BLOCK
 *   openai/gpt-5.5     same blocks, rendered with Markdown headers for the reasoning model
 */

export const TOOL_INTRO_BLOCK =
  'You have access to a `generate_mdma` function for building interactive documents.';

export const WHEN_TO_CALL_CASES =
  'forms, surveys, tables, dashboards, step flows, approval workflows, file uploads, charts, ' +
  'or any other interactive UI component';

export const WHEN_NOT_TO_CALL_CASES =
  'questions about MDMA or its capabilities, conversational replies, clarifications, or acknowledgements';

export const CALL_RULES_BLOCK =
  'Write the complete MDMA document in the `document` argument — ' +
  'never include raw MDMA Markdown in your text response. ' +
  'You may follow up with a short summary of what you built.';

/**
 * Generic OpenAI variant — prose format, works across the GPT family.
 * Reasoning models (gpt-5.5+) get a dedicated variant with Markdown headers.
 */
export const MDMA_AGENT_TOOL_PROMPT_OPENAI = `${TOOL_INTRO_BLOCK}

Call \`generate_mdma\` when the user asks to create, build, design, or update any interactive component — ${WHEN_TO_CALL_CASES}.

Do NOT call \`generate_mdma\` for: ${WHEN_NOT_TO_CALL_CASES}.

${CALL_RULES_BLOCK}`;
