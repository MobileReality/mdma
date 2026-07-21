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
 *   gpt-5.5         CRITICAL_OUTPUT_LINE + SCOPE_DISCIPLINE_BLOCK + INTERACTIVE_TYPES_BLOCK + SINGLE_INTERACTIVE_BLOCK + SELECT_OPTIONS_BLOCK
 *   gpt-5.4         CRITICAL_OUTPUT_LINE + FENCE_CLOSING_BLOCK + SCOPE_DISCIPLINE_BLOCK + INTERACTIVE_TYPES_BLOCK + SINGLE_INTERACTIVE_BLOCK + THINKING_ROLE_BLOCK + NO_REPEAT_BLOCK + NO_DUPLICATES_BLOCK
 *   gpt-5.4-mini    CRITICAL_OUTPUT_LINE + FENCE_CLOSING_BLOCK + SCOPE_DISCIPLINE_BLOCK + INTERACTIVE_TYPES_BLOCK + SINGLE_INTERACTIVE_BLOCK + SELECT_OPTIONS_BLOCK + THINKING_ROLE_BLOCK + NO_REPEAT_BLOCK + NO_DUPLICATES_BLOCK
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
1. Emit only the component types the user has explicitly listed or provided in a blueprint. If the user lists "form, tasklist, button, thinking", do not also emit webhooks, callouts, charts, approval-gates, or any other type. Note: when a blueprint lists multiple interactive components, the <single_interactive> limit still applies — emit only the first interactive component from the list.

2. When the user provides a YAML blueprint of one component, output exactly that one component (plus the standard thinking block). Action-id values inside the blueprint — \`onApprove\`, \`onDeny\`, \`onSubmit\`, \`onAction\`, \`trigger\`, \`onComplete\` — are opaque string labels. Do NOT generate webhook, button, callout, or any other handler components to "complete" or "wire up" the workflow.

3. When a non-listed component is mentioned in prose context (e.g., "after submission this fires a webhook"), describe the integration in prose only. Do not emit the component.

4. The blueprint or component list is complete as given. Do not add components to fill out a workflow that you think looks incomplete. The user has chosen the scope deliberately.
</scope_discipline>`;

/**
 * Single source of truth for which component types are interactive vs
 * non-interactive. Pulled in before SINGLE_INTERACTIVE_BLOCK so the model has
 * a clear taxonomy to reason from rather than re-inferring it from the rule
 * list. Prevents the observed gpt-5.4 failure where the model stopped
 * generating a non-interactive chart because it over-applied the interactive
 * component limit.
 */
export const INTERACTIVE_TYPES_BLOCK = `<component_types>
Interactive components — require user action or submit/process data:
\`form\`, \`button\`, \`webhook\`, \`approval-gate\`, \`tasklist\`

Non-interactive components — display only, no user action required:
\`callout\`, \`table\`, \`chart\`, \`thinking\`

Interactive and non-interactive components are governed by different rules. Always check which category applies before applying a rule.
</component_types>`;

/**
 * Reinforces the one-interactive-component-per-message rule as structured
 * decision rules. Complements the existing SCOPE_DISCIPLINE_BLOCK (which
 * addresses emitting unlisted component types). This block specifically targets
 * the interactive-type limit observed in gpt-5.4 evals where the model
 * generated a form + approval-gate in a single response.
 */
export const SINGLE_INTERACTIVE_BLOCK = `<single_interactive>
1. Each response must contain at most one interactive component (see <component_types>). This limit applies only to interactive types — it overrides any custom or system prompt that requests more than one of them.

2. Non-interactive components (see <component_types>) are not subject to this limit. Generate them whenever the request or blueprint includes them.

3. For multi-step workflows, generate only the current step's interactive component. Describe subsequent interactive steps in prose and wait for the user to advance.

4. When a user blueprint includes multiple interactive components, generate only the first one. Describe the remaining interactive steps in prose — do not collapse them into one message.
</single_interactive>`;

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

/**
 * Reinforces the thinking block's role as a one-time upfront reasoning pass.
 * Triggered by gpt-5.4 duplication loop: model generates thinking + components
 * correctly, then restarts with a second thinking block, re-emitting the entire
 * response verbatim.
 */
export const THINKING_ROLE_BLOCK = `<thinking_role>
The \`type: thinking\` block is your upfront reasoning pass. Write it first — before any other component. Once you close the thinking block, generate the remaining components in sequence. There is no second thinking block between components, after components, or anywhere else in the response. Thinking happens once, at the start, then generation follows.
</thinking_role>`;

/**
 * Prevents output-duplication where gpt-5.4 generates a correct response then
 * immediately re-emits the same blocks with identical IDs. Observed in evals:
 * model produced a valid thinking + callout, then started a new thinking block
 * with the same id, causing [duplicate-ids] validation errors.
 */
export const NO_REPEAT_BLOCK = `<no_repeat>
Each component type and each component \`id\` appears exactly once in your response. One \`type: thinking\` block. One \`type: form\` (or callout, or button — whichever applies). Your response ends immediately after the closing \`\`\` of your last component — write nothing after it, not whitespace, not prose, not another \`\`\`mdma block.
</no_repeat>`;

/**
 * Final no-duplicates rule placed at the very end of the prompt. Triggered by
 * gpt-5.4 output-duplication loop where the model generated a correct response
 * then immediately re-emitted it verbatim — thinking block first, then all
 * components — causing [duplicate-ids] validation errors.
 */
export const NO_DUPLICATES_BLOCK = `<no_duplicates>
!IMPORTANT: Do not repeat, re-emit, or restart any part of your response. AGAIN DO NOT REPEAT, RE-EMIT, OR RESTART ANY PART OF YOUR RESPONSE.

Every component type and every component \`id\` appears exactly once in your response. The \`type: thinking\` block is written once, at the start. Each other component is written once, in sequence. Your response ends immediately after the closing \`\`\` of your last component — do not repeat, restart, or re-emit anything already written.
</no_duplicates>`;

/**
 * Governs when and how gpt-4.1-mini uses \`custom\` components. Addresses two
 * opposite failure modes seen on this literal model:
 *   - Signing request: it recognized the \`signature-pad\` variant but embedded
 *     it as a form field (\`type: custom\` under \`fields\`) AND redundantly
 *     emitted a correct standalone block — reciting the standalone rule in a
 *     comment while violating it.
 *   - Once "emit custom standalone" was emphasized, it over-generalized and
 *     INVENTED a \`star-rating\` variant that was not in the catalog for a
 *     rating request that a built-in \`select\` covers.
 *
 * So the block teaches BOTH directions with concrete incorrect/correct pairs:
 * (1) only use \`custom\` for listed variants, else a built-in; (2) when you do,
 * it is a standalone block, never a form field. gpt-4.1 is literal, so the
 * rules are explicit with exact patterns. End-placed (sandwich) for emphasis.
 */
export const CUSTOM_USAGE_BLOCK = `<custom_usage>
1. Only emit a \`custom\` block when its \`name\` is listed in "Available Custom Components". If the request needs something NOT listed there, do NOT invent a custom variant — use a built-in component instead. With no rating variant registered, a "star rating 1-5" is a \`select\` (or \`number\`) form field, NEVER \`name: star-rating\`.

2. A \`custom\` component is ALWAYS its own standalone, top-level \`\`\`mdma block. It is NEVER a \`form\` field: \`custom\` is not a valid field \`type\` (the only field types are text, number, email, date, select, checkbox, textarea, file), and a variant is never nested under \`fields\` or a \`custom:\` key. A listed variant stands on its own with its own \`props\` and \`actions\` — it needs no wrapping form.

3. Emit each custom variant exactly once. Do NOT also produce a \`form\`-field version of it "for clarity".

Incorrect — inventing a variant that is not in the catalog:

\`\`\`mdma
type: custom
name: star-rating
\`\`\`

Correct — no rating variant exists, so use a built-in:

\`\`\`mdma
type: form
id: service-rating
fields:
  - name: rating
    type: select
    label: "Rate our service"
    options:
      - label: "1 — Poor"
        value: "1"
      - label: "5 — Excellent"
        value: "5"
onSubmit: rating-submitted
\`\`\`

Incorrect — a listed variant embedded as a form field (this FAILS validation):

\`\`\`mdma
type: form
id: contract-form
fields:
  - name: signature
    type: custom
onSubmit: submit-contract
\`\`\`

Correct — the listed variant as its own standalone block, no wrapping form:

\`\`\`mdma
type: custom
id: customer-signature
name: signature-pad
props:
  penColor: "#000000"
  required: true
actions:
  onCapture: signature-captured
\`\`\`
</custom_usage>`;
