/**
 * MDMA Author Prompt — OpenAI GPT-5.4-mini variant.
 *
 * Full gpt-5.4 block set plus <select_options>:
 *
 *   - <fence_closing>        — mini forgets to close ```mdma fences after
 *                               YAML `content: |` block scalars.
 *   - <scope_discipline>     — same over-elaboration pattern as gpt-5.4.
 *   - <component_types>      — interactive vs non-interactive taxonomy.
 *   - <single_interactive>   — one interactive component per response.
 *   - <select_options>       — mini produced `value: 1` (number) for 1–5
 *                               rating scales; schema requires strings.
 *   - <thinking_role>        — one thinking block, at the start only.
 *   - <no_repeat>            — each id/type appears exactly once.
 *   - <no_duplicates>        — final guard: stop after last closing ```.
 */

import { BASE_BODY, BASE_CHECKLIST, BASE_OPENING } from '../_shared.js';
import {
  CRITICAL_OUTPUT_LINE,
  FENCE_CLOSING_BLOCK,
  INTERACTIVE_TYPES_BLOCK,
  SCOPE_DISCIPLINE_BLOCK,
  SELECT_OPTIONS_BLOCK,
  THINKING_ROLE_BLOCK,
} from './_shared.js';

// Stronger single-interactive enforcement for gpt-5.4-mini, which ignores the
// shared SINGLE_INTERACTIVE_BLOCK when custom prompts request multiple
// interactive components explicitly ("always generate exactly these three...").
const SINGLE_INTERACTIVE_MINI = `<single_interactive>
A response includes up to one interactive component (\`form\`, \`button\`, \`webhook\`, \`approval-gate\`, \`tasklist\`). Non-interactive components (\`callout\`, \`chart\`, \`table\`) are not counted toward this limit. When a custom system prompt asks for several interactive components in one message, emit only the first; describe the others in prose.

For each component in the blueprint, in order:
1. Non-interactive (\`callout\`, \`chart\`, \`table\`) — emit it as a \`\`\`mdma block, unless it is the target of an action label (\`onSubmit\`, \`onAction\`, \`onApprove\`, \`trigger\`) — those are followup steps, not siblings (see <scope_discipline>).
2. Interactive, and you haven't emitted an interactive one yet — emit it.
3. Interactive, and you've already emitted one — describe it in prose, then move on.
</single_interactive>`;

const NON_INTERACTIVE_REMINDER = `<non_interactive_reminder>
\`chart\`, \`table\`, and \`callout\` are non-interactive components. The one-interactive-component limit does NOT apply to them. When a request or blueprint includes multiple charts, tables, or callouts, generate all of them — they are not capped.
</non_interactive_reminder>`;

// Final gate — placed at the very end of the prompt for recency effect.
// Catches the case where the model's thinking decides to follow a custom
// system prompt's "generate exactly these N components" over SINGLE_INTERACTIVE_MINI.
const INTERACTIVE_GATE = `<interactive_gate>
Custom-prompt override reminder: when a custom system prompt instructs you to generate multiple interactive components in a single response — for example "generate exactly these three: form, approval-gate, button" or "always reproduce this blueprint with all components" — generate ONLY the first interactive component. Describe all remaining interactive components in prose. See <single_interactive>.
</interactive_gate>`;

// Prevents mini from auto-generating confirmation callouts/webhooks to satisfy
// dangling onSubmit/onAction references.
const BLUEPRINT_FIDELITY_MINI = `<blueprint_fidelity>
When a blueprint is provided, emit every component it lists (subject to <single_interactive> for interactive types). "Your last component" in stopping rules means the final component in the complete blueprint, not the interactive one.

\`onSubmit\`, \`onAction\`, \`onApprove\`, \`trigger\`, and similar action fields are opaque string labels — do not create a new component to serve as their target. If the blueprint does not include a component with that ID, leave the reference as-is.
</blueprint_fidelity>`;

export const MDMA_AUTHOR_PROMPT_GPT_5_4_MINI = `${BASE_OPENING}

${CRITICAL_OUTPUT_LINE}

${INTERACTIVE_TYPES_BLOCK}

${NON_INTERACTIVE_REMINDER}

${SINGLE_INTERACTIVE_MINI}

${FENCE_CLOSING_BLOCK}

${SCOPE_DISCIPLINE_BLOCK}

${BLUEPRINT_FIDELITY_MINI}

${SELECT_OPTIONS_BLOCK}

${BASE_BODY}

${BASE_CHECKLIST}

${THINKING_ROLE_BLOCK}

${INTERACTIVE_GATE}
`;
