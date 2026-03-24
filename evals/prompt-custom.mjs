import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function for custom system prompt tests.
 *
 * Like prompt.mjs, but passes `vars.customPrompt` to buildSystemPrompt()
 * so the MDMA author prompt is layered with a user-defined system prompt.
 */
export default function ({ vars }) {
  const systemPrompt = buildSystemPrompt({
    customPrompt: vars.customPrompt,
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
