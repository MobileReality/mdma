import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function.
 *
 * Receives `context.vars` from each test case and returns an OpenAI-compatible
 * chat message array with the MDMA author system prompt + the user request.
 *
 * The system prompt contains `{{binding}}` syntax that Nunjucks would try to
 * evaluate, so we wrap it in {% raw %} blocks to prevent template processing.
 */
export default function ({ vars }) {
  const systemPrompt = buildSystemPrompt();

  // Escape {{ }} in the system prompt so Nunjucks doesn't interpret them
  const escaped = systemPrompt.replaceAll('{{', '{% raw %}{{').replaceAll('}}', '}}{% endraw %}');

  return [
    { role: 'system', content: escaped },
    { role: 'user', content: vars.request },
  ];
}
