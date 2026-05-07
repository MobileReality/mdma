/**
 * Shared content for MDMA-Author xAI (Grok) variants.
 *
 * Format choice: Markdown (`##` / `###` headers) rather than XML tags.
 * The xAI prompt-engineering community consistently flags that Grok
 * responds unpredictably to "pseudo system/persona toggles and long,
 * heavily instrumented prompt headers." The published Grok guidance
 * recommends keeping master prompts "boring" and using a clean
 * hierarchical structure (Role → Task → Constraints → Verification).
 * The cross-variant base body (`mdma-author/_shared.ts:BASE_BODY`) is
 * already heavily Markdown-headed, so Markdown stays consistent
 * end-to-end and avoids the over-instrumentation pattern Grok dislikes.
 *
 * Sibling of `mdma-author/openai/_shared.ts`,
 * `mdma-author/anthropic/_shared.ts`, and `mdma-author/google/_shared.ts`.
 * The `_` filename prefix is recognized by `evals/select-prompt.mjs` and
 * skipped during variant discovery.
 *
 * Note: block CONTENT is duplicated across vendor `_shared.ts` files.
 * Redundancy is preferred over cross-vendor imports — each vendor folder
 * remains self-contained, so a Grok-specific tweak here doesn't
 * accidentally affect other vendors' variants.
 */

/**
 * Output-format directive. Placed at the TOP of the variant (right after
 * BASE_OPENING) — the Grok prompting playbook recommends a clear
 * hierarchical opening with the role and the output contract up front.
 * Markdown-headed (`## Output Format`) for consistency with the rest of
 * the prompt.
 *
 * Note on instrumentation: an earlier revision added a "first non-whitespace
 * character must be # or ```mdma" rule + an explicit list of forbidden
 * preamble strings. That regressed the eval (8 → 17 failures) because Grok
 * started "drafting then revising" — emitting first-attempt blocks with
 * typos, then "No, I have to copy it exactly", then second-attempt blocks.
 * Grok's own community guidance says "Grok responds unpredictably to long,
 * heavily instrumented prompt headers" — keep this directive minimal.
 */
export const OUTPUT_FORMAT_BLOCK = `## Output Format

Your output IS the Markdown document — write headings, paragraphs, and \`\`\`mdma blocks directly. Do not wrap your response in \`\`\`markdown fences; the response renders as Markdown automatically. Generate the document once and stop.`;

/**
 * Pushes back on emitting components beyond what the user listed or
 * provided as a blueprint. Same rules as the OpenAI / Anthropic / Google
 * sibling files — the failure mode (model adds unsolicited buttons,
 * webhooks, tasklists, etc.) is universal across vendors. Markdown
 * formatted (`## Scope Discipline`) for Grok consistency. Mirrors the
 * Google variant's strengthened rule #4 — concrete workflow-context
 * examples have proven important for mid/smaller-tier models elsewhere.
 */
export const SCOPE_DISCIPLINE_BLOCK = `## Scope Discipline

1. Emit only the component types the user has explicitly listed or provided in a blueprint. If the user lists "form, tasklist, button, thinking", do not also emit webhooks, callouts, charts, approval-gates, or any other type.

2. When the user provides a YAML blueprint of one component, output exactly that one component (plus the standard thinking block). Action-id values inside the blueprint — \`onApprove\`, \`onDeny\`, \`onSubmit\`, \`onAction\`, \`trigger\`, \`onComplete\` — are opaque string labels. Do NOT generate webhook, button, callout, or any other handler components to "complete" or "wire up" the workflow.

3. When a non-listed component is mentioned in prose context (e.g., "after submission this fires a webhook"), describe the integration in prose only. Do not emit the component.

4. The blueprint or component list is complete as given. Do not add components to fill out a workflow that you think looks incomplete. The user has chosen the scope deliberately — even when the broader workflow context (e.g., "retrospective", "onboarding", "approval flow", "incident review") might suggest additional components like feedback forms, action-item tasklists, follow-up buttons, or status callouts. If the user listed only display components (callout, chart, table), emit only those — do not add interactive collection components on your own initiative.`;

/**
 * Forces select option `value` fields to be strings. Same rule as the
 * other vendor sibling blocks — schema requires string values
 * (`z.array(z.object({ label: z.string(), value: z.string() }))`), but
 * models default to `value: 1` when the user describes options as numbers
 * ("rating 1-5"). Markdown formatted for Grok.
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
