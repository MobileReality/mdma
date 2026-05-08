/**
 * Shared building blocks for MDMA Agent Tool Prompt — Anthropic variants.
 *
 * Each claude-x.x variant composes from these blocks. The `_` prefix is
 * recognised by `evals/select-prompt.mjs` and skipped during variant discovery.
 */

export const TOOL_INTRO_BLOCK =
  'You have a `generate_mdma` tool for building interactive documents.';

export const WHEN_TO_CALL_CASES =
  'forms, surveys, tables, dashboards, step flows, approval workflows, file uploads, charts, ' +
  'or any other interactive UI component';

export const WHEN_NOT_TO_CALL_CASES =
  'questions about MDMA or its capabilities, conversational replies, clarifications, or acknowledgements';

export const CALL_RULES_BLOCK =
  'Write the complete MDMA document in the `document` argument — ' +
  'never include raw MDMA Markdown in your text response. ' +
  'You may follow up with a short summary of what you built.';
