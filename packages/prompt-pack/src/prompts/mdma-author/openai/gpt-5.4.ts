/**
 * MDMA Author Prompt — OpenAI GPT-5.4 variant.
 *
 * Tuned for a specific failure mode observed during evals: gpt-5.4 has a
 * tendency to add components beyond what the user listed when the workflow
 * "seems to call for them" — e.g., adding a webhook to a form/tasklist/button
 * spec because submission usually fires a webhook. The default prompt's
 * Authoring Rules #6 ("Minimal components — only include components that are
 * necessary") is too soft for this model.
 *
 * The fix is a `<scope_discipline>` block hoisted between the opening and
 * the spec body. The mini variant is in `gpt-5.4-mini.ts` with a different
 * targeted fix (`<fence_closing>`); same composition shape, different framing.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';

const SCOPE_DISCIPLINE_BLOCK = `<scope_discipline>
When the user lists specific component types for the document (e.g., "use form, tasklist, button, thinking"), include only those types — even when another component type would seem helpful for the workflow. Webhooks, callouts, charts, approval-gates, etc. are NOT added unless explicitly listed.

If the user mentions a non-listed component as context (e.g., "after submission, the form is sent to a webhook" but the listed types are form, tasklist, button only), describe the integration in prose or as a field comment, but do not emit a webhook component.

Stick to the listed components, even if the result feels incomplete. The user has chosen the scope deliberately.
</scope_discipline>`;

export const MDMA_AUTHOR_PROMPT_GPT_5_4 = `${BASE_OPENING}

CRITICAL: Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. NEVER wrap your response in \`\`\`markdown code fences. Your response is already rendered as Markdown.

${SCOPE_DISCIPLINE_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}
`;
