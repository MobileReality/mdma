import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';

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
 *
 * The author prompt is resolved from `EVAL_PROVIDER` — if a model-specialized
 * variant lives at packages/prompt-pack/src/prompts/<family>/<model>.ts, it
 * wins over the default. Resolution is deferred into a promise (no top-level
 * await — promptfoo loads `.mjs` via tsx/cjs which forbids it) and cached so
 * the selector runs once per eval run.
 */
const authorPromptPromise = selectAuthorPrompt().then(({ prompt, source }) => {
  console.error(`[author] system prompt: ${source}`);
  return buildSystemPrompt({ authorPrompt: prompt });
});

export default async function ({ vars }) {
  const systemPrompt = await authorPromptPromise;

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
