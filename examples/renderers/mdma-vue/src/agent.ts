import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { GRAPH_3D_CATALOG_ENTRY } from './custom';

/**
 * The system prompt. `buildSystemPrompt()` returns the canonical MDMA author
 * prompt — the full DSL spec that teaches the model to emit fenced `mdma`
 * blocks — and the addendum steers it toward a chat register: answer as an
 * assistant, and drop in interactive components inline where a UI beats prose.
 *
 * `customComponents` advertises the host-registered `graph-3d` variant so the
 * model may author a `custom` block for it — the author prompt forbids inventing
 * a custom `name` that isn't in this catalog.
 */
const CHAT_RULES = `
You are a helpful assistant in a chat UI that can render live MDMA components.

Reply conversationally. When an interactive UI would serve the user better than
prose — collecting details, presenting a choice, showing tabular data, asking for
sign-off — include the relevant \`mdma\` fenced block(s) directly in your reply,
surrounded by ordinary Markdown. A short sentence of context before a component is
good; do not also transcribe the component as prose. Keep replies focused.

For quantitative data prefer a \`chart\` block (variant: bar, line, area, or pie)
over a plain table. When a metric varies across TWO categorical dimensions at once
(e.g. revenue by region AND quarter), use the \`graph-3d\` custom component and wire
its \`actions.onSelect\`.`;

export const SYSTEM_PROMPT = `${buildSystemPrompt({ customComponents: [GRAPH_3D_CATALOG_ENTRY] })}\n${CHAT_RULES}`;

/** Starter prompts shown on the empty state. */
export const SUGGESTIONS = [
  'Help me file a bug report',
  'Chart our quarterly revenue',
  'Show sales by region and quarter as a 3D graph',
  'Collect my shipping details',
];
