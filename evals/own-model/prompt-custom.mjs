import { buildSystemPrompt, getAuthorPromptVariant } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function — custom-system-prompt suite for our model.
 *
 * Same wiring as the other models' custom suite: the `mobile-reality/mdma-il`
 * author prompt layered with each test's `customPrompt` (which prescribes the
 * exact MDMA structure to produce), then the NL `request` as the user message.
 * Output is validated against the schema — "output based on the provided input".
 *
 * The author variant is looked up directly from the registry (decoupled from
 * the provider id).
 */
const OWN_AUTHOR_PROMPT = getAuthorPromptVariant('mobile-reality/mdma-il').prompt;

export default function ({ vars }) {
  const systemPrompt = buildSystemPrompt({
    authorPrompt: OWN_AUTHOR_PROMPT,
    customPrompt: vars.customPrompt,
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
