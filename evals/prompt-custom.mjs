import { buildSystemPrompt } from '@mdma/prompt-pack';

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

  const escaped = systemPrompt.replaceAll('{{', '{% raw %}{{').replaceAll('}}', '}}{% endraw %}');

  return [
    { role: 'system', content: escaped },
    { role: 'user', content: vars.request },
  ];
}
