/**
 * MDMA Author Prompt — OpenAI GPT-5.4-mini variant.
 *
 * Tuned for a specific failure mode observed during evals: when emitting a
 * thinking block (or any component) with a YAML `content: |` block scalar
 * followed by another component, gpt-5.4-mini sometimes forgets to close the
 * \`\`\`mdma fence with three backticks before the next block. CommonMark
 * requires the closing fence to be plain \`\`\` (not \`\`\`mdma) — a missing
 * closing fence makes every subsequent \`\`\`mdma look like prose inside the
 * still-open block, and validation reports "type: X outside of mdma fenced
 * block" errors.
 *
 * The fix here is a `<fence_closing>` block hoisted between the opening and
 * the spec body, with a positive worked example of two adjacent components
 * done correctly. Negative framing (a "do not" example) is kept short — the
 * goal is positive pattern matching for the model to mirror.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

const FENCE_CLOSING_BLOCK = `<fence_closing>
Every \`\`\`mdma block opens with \`\`\`mdma and closes with three backticks (\`\`\`) alone on a line, before any new content. This is required even when the previous block uses a YAML \`content: |\` block scalar — the block scalar ends when indentation drops, but the closing fence still has to be written explicitly.

Two adjacent components look like this:

\`\`\`mdma
type: thinking
id: planning
status: done
collapsed: true
content: |
  Brief reasoning about the request.
  The closing three backticks are required on the next line.
\`\`\`

\`\`\`mdma
type: form
id: contact-form
fields:
  - name: email
    type: email
    label: Email
    required: true
\`\`\`

A new \`\`\`mdma after a still-open block is treated as text inside the open block — not as a new component.
</fence_closing>`;

export const MDMA_AUTHOR_PROMPT_GPT_5_4_MINI = `${BASE_OPENING}

CRITICAL: Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. NEVER wrap your response in \`\`\`markdown code fences. Your response is already rendered as Markdown.

${FENCE_CLOSING_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
