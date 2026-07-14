/**
 * The system prompt: the MDMA author prompt (DSL knowledge) composed with the conversational agent
 * tool prompt, plus this example's own rules for `set_state`, plus per-turn context about what the
 * agent already knows and has already rendered.
 */
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { PROMPT_VARIANT } from './config';
import type { ThreadState } from './state';

const SET_STATE_RULES = `
You also have a \`set_state\` function. MDMA components are headless — their VALUES come from shared state. Whenever the user gives you personal information (name, email, phone, address, preferences), call \`set_state\` with componentId "profile" and the field(s), e.g. { "name": "Marcin", "email": "x@y.com" }. ALWAYS use "profile" for personal info — never a form id. Rendered forms pre-fill automatically from the profile.

To change the VALUE of a field on a form you have ALREADY rendered — e.g. "set severity to high", "pick DEV for environment", "check that box" — call \`set_state\` with THAT form's componentId and just the field(s) you are changing, e.g. { "severity": "high" }. The live form updates in place. Do NOT re-render the form to change a value. For \`select\` fields the value must be the option's \`value\` (e.g. \`high\`), not its label. Re-rendering with \`generate_mdma\` is only for STRUCTURAL changes (adding/removing a field, changing options or type).

Do not restate saved data as prose; just save it and give a one-line acknowledgement.`;

const BASE_PROMPT = `${buildSystemPrompt({ customPrompt: PROMPT_VARIANT.prompt })}\n${SET_STATE_RULES}`;

/**
 * Shared state doubles as the agent's memory — it's what lets it answer "what's my email?" and
 * pre-fill forms, not just a client-side hydration detail.
 */
function memoryContext(state: ThreadState): string {
  if (!Object.keys(state.components).length) return '';
  return `\n\nRemembered state for this conversation (JSON, componentId → values). Use it to pre-fill forms and to answer questions about values the user has already given you:\n${JSON.stringify(state.components)}`;
}

/**
 * What's already on screen. Without this the model can't see its own rendered components (they go
 * out-of-band on CUSTOM events), so it would rebuild rather than update — and value changes must
 * route to set_state, not to a re-render.
 */
function renderedContext(state: ThreadState): string {
  if (!Object.keys(state.docs).length) return '';
  return `\n\nComponents you have ALREADY rendered to the user in this conversation (id → MDMA). To change a field's VALUE on one of these (select an option, fill a field, set severity, etc.), call set_state with that component's id — do NOT re-render. Only call generate_mdma again (with the SAME id, never a near-duplicate new id) for STRUCTURAL changes: adding or removing a field, or changing a field's options or type:\n${Object.values(state.docs).join('\n\n')}`;
}

export function systemMessage(state: ThreadState): string {
  return BASE_PROMPT + memoryContext(state) + renderedContext(state);
}
