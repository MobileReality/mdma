/**
 * Shared content for MDMA-Author Anthropic variants.
 *
 * Each Anthropic variant composes a subset of these blocks via template-
 * literal interpolation. Sibling of `mdma-author/openai/_shared.ts`. The `_`
 * filename prefix is recognized by `evals/select-prompt.mjs` and skipped
 * during variant discovery.
 *
 * Note: some block contents (e.g. `SCOPE_DISCIPLINE_BLOCK`) are duplicated
 * across vendor `_shared.ts` files. Redundancy is preferred over
 * cross-vendor imports — each vendor folder remains self-contained, so a
 * vendor-specific tweak to a block here doesn't accidentally affect another
 * vendor's variants.
 */

/**
 * Pushes back on emitting components beyond what the user listed or provided
 * as a blueprint. Triggered by a Haiku flows failure where the model added
 * unsolicited `button` and `tasklist` components to scoped specs whose
 * allowed list did not include them.
 *
 * Same content as `openai/_shared.ts:SCOPE_DISCIPLINE_BLOCK` — kept in sync
 * by hand. Structured as numbered decision rules per OpenAI's gpt-5
 * prompt guidance ("Use structural scaffolding such as numbered steps,
 * decision rules"); the same structural style works for Claude.
 */
export const SCOPE_DISCIPLINE_BLOCK = `<scope_discipline>
1. Emit only the component types the user has explicitly listed or provided in a blueprint. If the user lists "form, tasklist, button, thinking", do not also emit webhooks, callouts, charts, approval-gates, or any other type.

2. When the user provides a YAML blueprint of one component, output exactly that one component (plus the standard thinking block). Action-id values inside the blueprint — \`onApprove\`, \`onDeny\`, \`onSubmit\`, \`onAction\`, \`trigger\`, \`onComplete\` — are opaque string labels. Do NOT generate webhook, button, callout, or any other handler components to "complete" or "wire up" the workflow.

3. When a non-listed component is mentioned in prose context (e.g., "after submission this fires a webhook"), describe the integration in prose only. Do not emit the component.

4. The blueprint or component list is complete as given. Do not add components to fill out a workflow that you think looks incomplete. The user has chosen the scope deliberately.
</scope_discipline>`;

/**
 * Forces explicit ``` closing fences after every mdma block. Triggered by
 * a Sonnet flows failure where the third (final) mdma block in a multi-
 * component response opened with ```mdma but the output ended without
 * the closing ```. Validator regex requires the closing fence to consider
 * the block valid.
 *
 * Same content as `openai/_shared.ts:FENCE_CLOSING_BLOCK` — kept in sync
 * by hand. The redundancy is intentional: vendor folders stay self-
 * contained, so a Claude-specific tweak here doesn't bleed into OpenAI
 * variants.
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
