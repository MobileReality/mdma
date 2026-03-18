import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt function.
 *
 * Receives `context.vars` from each test case and returns an OpenAI-compatible
 * chat message array with the MDMA author system prompt + the user request.
 *
 * The system prompt contains `{{binding}}` syntax that Nunjucks would try to
 * evaluate. We wrap the entire content in {% raw %}...{% endraw %} so Nunjucks
 * passes it through verbatim — the model sees clean `{{...}}` without any
 * template artifacts.
 */
export default function ({ vars }) {
  const systemPrompt = buildSystemPrompt();

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: vars.request },
  ];
}
