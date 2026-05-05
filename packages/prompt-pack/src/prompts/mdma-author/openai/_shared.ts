/**
 * Shared content for MDMA-Author OpenAI variants.
 *
 * Each gpt-5.x variant composes a subset of these blocks via template-literal
 * interpolation. Mirror of `mdma-author/anthropic/_shared.ts` but for OpenAI
 * tier-specific framing — these blocks address failure modes observed
 * specifically on gpt-5.4-family models. The `_` filename prefix is recognized
 * by `evals/select-prompt.mjs` and skipped during variant discovery.
 *
 * Variant matrix (which blocks each variant pulls in):
 *
 *   gpt-5.5         CRITICAL_OUTPUT_LINE
 *   gpt-5.4         CRITICAL_OUTPUT_LINE + SCOPE_DISCIPLINE_BLOCK
 *   gpt-5.4-mini    CRITICAL_OUTPUT_LINE + FENCE_CLOSING_BLOCK + SELECT_OPTIONS_BLOCK
 *   gpt-5.4-nano    all of the above
 */

export const CRITICAL_OUTPUT_LINE =
  'CRITICAL: Your output IS the Markdown document — write headings, paragraphs, and ```mdma blocks directly. NEVER wrap your response in ```markdown code fences. Your response is already rendered as Markdown.';

/**
 * Forces explicit ``` closing fences after every mdma block, even when the
 * preceding block uses a YAML `content: |` block scalar. Triggered by a
 * gpt-5.4-mini failure where the model opened a thinking block, used a YAML
 * block scalar, then started a new ```mdma fence without closing the previous
 * one — CommonMark treated everything that followed as text inside the still-
 * open block.
 */
export const FENCE_CLOSING_BLOCK = `<fence_closing>
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

/**
 * Pushes back on emitting components beyond what the user listed or provided
 * as a blueprint. Triggered by two failure patterns:
 *   - gpt-5.4: user listed "form, tasklist, button, thinking" but the model
 *     added two webhooks "because they fit the workflow"
 *   - gpt-5-mini: user gave a blueprint of one approval-gate with
 *     `onApprove: proceed-release` and the model added webhook components
 *     to fire when those action IDs trigger
 *
 * Structured as numbered decision rules per OpenAI's gpt-5 prompt guidance
 * ("Use structural scaffolding such as numbered steps, decision rules"),
 * not as `you MUST` emphasis. Each rule covers a distinct over-elaboration
 * vector observed in the eval suite.
 */
export const SCOPE_DISCIPLINE_BLOCK = `<scope_discipline>
1. Emit only the component types the user has explicitly listed or provided in a blueprint. If the user lists "form, tasklist, button, thinking", do not also emit webhooks, callouts, charts, approval-gates, or any other type.

2. When the user provides a YAML blueprint of one component, output exactly that one component (plus the standard thinking block). Action-id values inside the blueprint — \`onApprove\`, \`onDeny\`, \`onSubmit\`, \`onAction\`, \`trigger\`, \`onComplete\` — are opaque string labels. Do NOT generate webhook, button, callout, or any other handler components to "complete" or "wire up" the workflow.

3. When a non-listed component is mentioned in prose context (e.g., "after submission this fires a webhook"), describe the integration in prose only. Do not emit the component.

4. The blueprint or component list is complete as given. Do not add components to fill out a workflow that you think looks incomplete. The user has chosen the scope deliberately.
</scope_discipline>`;

/**
 * Forces select option `value` fields to be strings. Triggered by a flows
 * eval where the user said "options 1-5" and gpt-5.4-mini/nano produced
 * `value: 1` (number) instead of `value: "1"` (string). The form schema
 * (packages/spec/src/schemas/components/form.ts) requires
 * `z.array(z.object({ label: z.string(), value: z.string() }))`.
 */
export const SELECT_OPTIONS_BLOCK = `<select_options>
For \`type: select\` fields, every \`options\` entry has a string \`value\` — even when the user describes options as numbers (e.g., "rating 1-5") or booleans. The schema rejects numeric and boolean values.

Correct:

\`\`\`mdma
type: form
id: rating-form
fields:
  - name: rating
    type: select
    label: Rating
    options:
      - label: "1 — Poor"
        value: "1"
      - label: "5 — Excellent"
        value: "5"
\`\`\`

The label can read naturally to the user; the value is the stable string identifier sent on submit. \`value: 1\` (number) and \`value: true\` (boolean) fail validation.
</select_options>`;
