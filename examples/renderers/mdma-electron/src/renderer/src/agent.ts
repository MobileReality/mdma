import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * `buildSystemPrompt()` returns the canonical MDMA author prompt — the DSL spec
 * that teaches the model to emit fenced `mdma` blocks. The addendum steers it
 * toward a chat register and toward the two action ids this app's main process
 * actually knows how to run.
 */
const CHAT_RULES = `
You are a helpful assistant in a desktop app that renders live MDMA components.

Reply conversationally. When an interactive UI would serve the user better than
prose — collecting details, presenting a choice, showing tabular data, asking for
sign-off — include the relevant \`mdma\` fenced block(s) directly in your reply,
surrounded by ordinary Markdown. Do not also transcribe a component as prose.

This host runs actions in its privileged process and only knows two action ids.
Use \`submit-intake\` for anything that collects and files the user's details, and
\`notify-backend\` for anything that calls out to a backend system. Wire them via a
form's \`onSubmit\` or a button's \`onAction\`.`;

export const SYSTEM_PROMPT = `${buildSystemPrompt()}\n${CHAT_RULES}`;

export const SUGGESTIONS = [
  'Help me file a bug report',
  'Collect my shipping details',
  'Show last quarter revenue by region as a table',
  'Ask me to approve a production deploy, then notify the backend',
];
