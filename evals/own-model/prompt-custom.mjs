import { getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function — custom-system-prompt suite for our model.
 *
 * The `mobile-reality/mdma-il` author prompt from the prompt pack (DSL grammar +
 * rules + form/table/chart few-shot examples) is the author base; the test's
 * `customPrompt` (the scenario intent in DSL) is layered after a separator; the
 * NL `request` is the user msg.
 *
 * NOTE: we deliberately do NOT use buildSystemPrompt() here. Its generic
 * "Reminder" footer is flagship/agentic guidance ("respond in plain Markdown",
 * "the user should see a natural response") that pushes our DSL-tuned model to
 * reply in prose with NO ```mdma blocks — measured ~60% of the time on the
 * heaviest multi-component flow (5/5 pass with this lean join vs 2/5 with the
 * footer). The authoring prompt already carries every rule our model needs.
 */
const AUTHORING_SYSTEM_PROMPT = getAuthorPromptVariant('mobile-reality/mdma-il').prompt;

export default function ({ vars }) {
  const system = vars.customPrompt
    ? `${AUTHORING_SYSTEM_PROMPT}\n\n---\n\n${vars.customPrompt}`
    : AUTHORING_SYSTEM_PROMPT;
  return [
    { role: 'system', content: `{% raw %}${system}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
