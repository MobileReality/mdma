import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * The system prompt. `buildSystemPrompt()` returns the canonical MDMA author
 * prompt — the full DSL spec that teaches the model to emit fenced `mdma`
 * blocks — and the addendum steers it toward a chat register: answer as an
 * assistant, and drop in interactive components inline where a UI beats prose.
 */
const CHAT_RULES = `
You are a helpful assistant in a chat UI that can render live MDMA components.

Reply conversationally. When an interactive UI would serve the user better than
prose — collecting details, presenting a choice, showing tabular data, asking for
sign-off — include the relevant \`mdma\` fenced block(s) directly in your reply,
surrounded by ordinary Markdown. A short sentence of context before a component is
good; do not also transcribe the component as prose. Keep replies focused.`;

export const SYSTEM_PROMPT = `${buildSystemPrompt()}\n${CHAT_RULES}`;

/** Starter prompts shown on the empty state. */
export const SUGGESTIONS = [
  'Help me file a bug report',
  'I want to book a meeting room',
  'Show me a sales summary as a table',
  'Collect my shipping details',
];
