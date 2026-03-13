import { MASTER_PROMPT } from '@mobile-reality/mdma-cli/prompts';

/**
 * Promptfoo prompt function for CLI Prompt Builder eval.
 *
 * Sends the Master Prompt as the system message and the user's
 * serialized configuration as the user message. The LLM should
 * generate a `customPrompt` — a domain-specific prompt that uses
 * correct YAML-based MDMA examples.
 */
export default function ({ vars }) {
  const escaped = MASTER_PROMPT.replaceAll('{{', '{% raw %}{{').replaceAll('}}', '}}{% endraw %}');

  return [
    { role: 'system', content: escaped },
    { role: 'user', content: vars.request },
  ];
}
