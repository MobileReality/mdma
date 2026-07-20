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
 * Explicit decision boundary for follow-up turns. gpt-5.6-sol / gpt-5.6-luna
 * UNDER-called on the multi-turn guidance eval: asked to change a document they
 * had already generated ("add a phone field to that form", "add a Get Started
 * button"), they treated it as not-a-document-request and answered in prose
 * instead of calling `generate_mdma`. Per OpenAI's function-calling guidance,
 * models hesitate when the "when to call" description is generic — so this
 * spells out that modifying an existing document is still a call.
 */
export const MODIFY_FOLLOWUP_BLOCK =
  'Modifying a document you already generated is ALSO a call. If the user asks to add, remove, ' +
  'rename, reorder, restyle, or otherwise change a component from an earlier turn (e.g. "add a ' +
  'phone field to that form", "add a submit button", "make it a table"), call `generate_mdma` ' +
  'again and emit the FULL updated document — never describe the change in prose or leave it unbuilt.';

/**
 * Explicit boundary for workflows described as a real-world PROCESS rather than
 * an explicit "make a form". gpt-5.6-luna under-called the expense-approval
 * case ("an employee submits an expense, a manager approves or rejects") — it
 * read the process description as conversational instead of a document request.
 * Restates that a described workflow still means "build the components".
 */
export const WORKFLOW_INTENT_BLOCK =
  'A request still counts even when phrased as a real-world process instead of "make a form/table/etc." ' +
  'For example, "employees submit an expense and a manager approves it" means build the expense form AND ' +
  'the approval gate. Infer the interactive components from the described workflow and call `generate_mdma`.';

/**
 * Coverage boundary against a HOST APPLICATION'S other tools. `generate_mdma`
 * is often registered next to a product's own tools; the coexistence eval
 * (evals/promptfooconfig.guidance-coexistence.js) showed smaller tiers hijacking
 * those calls — gpt-5-nano generated a document for "email Dana" and "schedule a
 * sync", gpt-4.1-nano/gpt-5.4-nano took a process-worded action owned by
 * `send_email`, and gpt-4.1-mini fired on a bare "thanks". Neither the generic
 * prompt nor the default said anything about other tools, so the model had no
 * rule to defer by. Per OpenAI's function-calling guidance, overlapping tools
 * need their boundary stated explicitly.
 */
export const OTHER_TOOLS_BLOCK =
  '`generate_mdma` ONLY produces interactive documents/UI. When another available tool directly ' +
  'performs the requested action — sending email, scheduling events, searching, fetching data, ' +
  'updating records — call THAT tool instead; never substitute a generated document for an action ' +
  'another tool owns. This holds even when the request is phrased as a process or workflow. And for ' +
  'greetings, thanks, or acknowledgements, call NO tool at all.';

/**
 * Generic OpenAI variant — prose format, works across the GPT family.
 * Reasoning models (gpt-5.5+) get a dedicated variant with Markdown headers.
 */
export const MDMA_AGENT_TOOL_PROMPT_OPENAI = `${TOOL_INTRO_BLOCK}

Call \`generate_mdma\` when the user asks to create, build, design, or update any interactive component — ${WHEN_TO_CALL_CASES}.

Do NOT call \`generate_mdma\` for: ${WHEN_NOT_TO_CALL_CASES}.

${OTHER_TOOLS_BLOCK}

${CALL_RULES_BLOCK}`;
