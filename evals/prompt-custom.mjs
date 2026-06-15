import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';

/**
 * Promptfoo prompt function for custom system prompt tests.
 *
 * Like prompt.mjs, but passes `vars.customPrompt` to buildSystemPrompt()
 * so the MDMA author prompt is layered with a user-defined system prompt.
 *
 * The author prompt base is resolved from the actual provider promptfoo is
 * calling (`context.provider.id`, falling back to `EVAL_PROVIDER`) — if a
 * model-specialized variant lives at packages/prompt-pack/src/prompts/mdma-author/
 * <family>/<model>.ts, it wins over the default. The selector falls back to
 * the canonical `MDMA_AUTHOR_PROMPT` when no variant matches, so unset or
 * unrecognized providers behave exactly as before. Resolution is deferred
 * into a promise (no top-level await — promptfoo loads `.mjs` via tsx/cjs
 * which forbids it) and cached so the selector runs only once per eval run.
 */
const promptByProvider = new Map();

function resolveAuthorPrompt(providerId) {
  if (!promptByProvider.has(providerId)) {
    promptByProvider.set(
      providerId,
      selectAuthorPrompt(providerId).then(({ prompt, source }) => {
        console.error(`[author-custom] system prompt: ${source}`);
        return prompt;
      }),
    );
  }
  return promptByProvider.get(providerId);
}

export default async function ({ vars, provider }) {
  const authorPrompt = await resolveAuthorPrompt(provider?.id ?? process.env.EVAL_PROVIDER);
  const systemPrompt = buildSystemPrompt({
    authorPrompt,
    customPrompt: vars.customPrompt,
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
