/**
 * Shared content for MDMA-Author Google (Gemini) variants.
 *
 * Format choice: Markdown (`##` / `###` headers) rather than XML tags.
 * Google's Gemini 3 prompting guide explicitly says to pick one structural
 * format and stay consistent — "use either XML-style tagging OR Markdown
 * consistently; mixing them confuses the model." The cross-variant base
 * body (`mdma-author/_shared.ts:BASE_BODY`) is heavily Markdown-headed
 * (`## Document Format`, `### 1. form`, …), so Markdown wins for Gemini.
 * The OpenAI and Anthropic vendor folders keep XML-tagged framing because
 * those vendors' published guides recommend XML scaffolding; Google's
 * does not.
 *
 * Constraint placement: Google's official Vertex prompting guide for
 * Gemini 3 says "place your core request and most critical restrictions
 * as the final line of your instruction. In particular, negative
 * constraints should be placed at the end of the instruction." Variants
 * compose these AFTER `BASE_BODY` (the spec content), opposite of the
 * Anthropic / OpenAI ordering where framing leads.
 *
 * Sibling of `mdma-author/openai/_shared.ts` and
 * `mdma-author/anthropic/_shared.ts`. The `_` filename prefix is recognized
 * by `evals/select-prompt.mjs` and skipped during variant discovery.
 *
 * Note: block CONTENT is duplicated across vendor `_shared.ts` files.
 * Redundancy is preferred over cross-vendor imports — each vendor folder
 * remains self-contained, so a Google-specific tweak here doesn't
 * accidentally affect other vendors' variants.
 */

/**
 * Pushes back on emitting components beyond what the user listed or
 * provided as a blueprint. Same rules as the OpenAI and Anthropic sibling
 * files; the failure mode (model adds unsolicited buttons, webhooks,
 * tasklists, etc.) is universal across vendors. Format differs: Markdown
 * `##` heading instead of XML `<scope_discipline>` tag, per Gemini's
 * "don't mix" guidance.
 */
export const SCOPE_DISCIPLINE_BLOCK = `## Scope Discipline

1. Emit only the component types the user has explicitly listed or provided in a blueprint. If the user lists "form, tasklist, button, thinking", do not also emit webhooks, callouts, charts, approval-gates, or any other type.

2. When the user provides a YAML blueprint of one component, output exactly that one component (plus the standard thinking block). Action-id values inside the blueprint — \`onApprove\`, \`onDeny\`, \`onSubmit\`, \`onAction\`, \`trigger\`, \`onComplete\` — are opaque string labels. Do NOT generate webhook, button, callout, or any other handler components to "complete" or "wire up" the workflow.

3. When a non-listed component is mentioned in prose context (e.g., "after submission this fires a webhook"), describe the integration in prose only. Do not emit the component.

4. The blueprint or component list is complete as given. Do not add components to fill out a workflow that you think looks incomplete. The user has chosen the scope deliberately — even when the broader workflow context (e.g., "retrospective", "onboarding", "approval flow", "incident review") might suggest additional components like feedback forms, action-item tasklists, follow-up buttons, or status callouts. If the user listed only display components (callout, chart, table), emit only those — do not add interactive collection components on your own initiative.`;

/**
 * Forces explicit ``` closing fences after every mdma block. Mirrors the
 * OpenAI and Anthropic sibling blocks (failure observed first on Sonnet
 * and gpt-5.4-mini — model opens a ```mdma block but doesn't close it
 * before the next component, so the validator regex can't recognize the
 * second block). Pre-emptively included for the smaller-tier Gemini
 * variants (flash-lite); the flagship Pro variant doesn't need it yet.
 *
 * Markdown formatted (`## Fence Closing`) for Gemini consistency.
 */
export const FENCE_CLOSING_BLOCK = `## Fence Closing

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

A new \`\`\`mdma after a still-open block is treated as text inside the open block — not as a new component.`;

/**
 * Forces select option `value` fields to be strings. Same rule as the
 * OpenAI and Anthropic sibling blocks — schema requires string values
 * (`z.array(z.object({ label: z.string(), value: z.string() }))`), but
 * models default to `value: 1` when the user describes options as numbers
 * ("rating 1-5"). Markdown formatted for Gemini.
 */
export const SELECT_OPTIONS_BLOCK = `## Select Option Values

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

The label can read naturally to the user; the value is the stable string identifier sent on submit. \`value: 1\` (number) and \`value: true\` (boolean) fail validation.`;

/**
 * Output-format directive. Placed near the TOP of the variant (right after
 * BASE_OPENING) — per Phil Schmid's Google guide, behavioral constraints
 * and role definitions anchor the model's reasoning when placed at the
 * top of the system instruction. An earlier revision put this as the
 * LITERAL final line of the prompt; Gemini 3.1 Pro then looped on the
 * customPrompt eval, re-reading the trailing imperative as a fresh action
 * prompt and regenerating the whole document (duplicate IDs). The
 * remaining negative constraints (scope discipline, select option values)
 * still belong at the end per Vertex's "negative constraints last" rule.
 *
 * Markdown-headed (`## Output Format`) rather than XML-tagged
 * (`<output_format>`) for consistency with the rest of the Gemini
 * prompt — Gemini 3's guide says don't mix XML and Markdown.
 */
export const OUTPUT_FORMAT_BLOCK = `## Output Format

Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically. Generate the document once and stop.`;

/**
 * Forces the model to emit the requested component as an actual ```mdma block
 * rather than describing it in prose. Triggered by a gemini-3.5-flash
 * conversation (multi-turn) failure: on step-triggered turns the model wrote a
 * thinking block plus a prose explanation ("I will present the claim form...")
 * and stopped (finishReason: stop) WITHOUT emitting the form — the turn had 0
 * form fields. One-shot authoring is unaffected; the drift is multi-turn only.
 * End-placed per Vertex's negative-constraints-last guidance.
 */
export const EMIT_COMPONENT_BLOCK = `## Emit the Component

When the conversation flow or the user's request calls for a component (form, table, callout, etc.), you MUST output it as a fenced \`\`\`mdma block in THIS turn. Do not describe the component in prose, announce that you will show it, or defer it to a later turn — the \`\`\`mdma block itself must be present. A turn that should produce a form is complete only when the \`\`\`mdma form block appears in your output; writing "I will present the form..." without the actual block is a failure.`;
