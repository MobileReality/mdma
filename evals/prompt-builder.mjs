import { selectMasterPrompt } from './select-prompt.mjs';

/**
 * Promptfoo prompt function for CLI Prompt Builder eval.
 *
 * Sends the Master Prompt as the system message and the user's
 * serialized configuration as the user message. The LLM should
 * generate a `customPrompt` — a domain-specific prompt that uses
 * correct YAML-based MDMA examples.
 *
 * The Master Prompt is resolved from the actual provider promptfoo is calling
 * (`context.provider.id`, falling back to `EVAL_PROVIDER`) — if a
 * model-specialized variant lives at packages/cli/src/prompts/<family>/<model>.ts,
 * it wins over the default.
 *
 * Note: promptfoo loads `.mjs` prompts via tsx/cjs (CJS-target esbuild),
 * which rejects top-level await — so resolution is deferred into a
 * promise that the async default export awaits on first call. The
 * promise is created once and cached, so the selector runs only once
 * per eval run.
 */
const promptByProvider = new Map();

function resolveMasterPrompt(providerId) {
  if (!promptByProvider.has(providerId)) {
    promptByProvider.set(
      providerId,
      selectMasterPrompt(providerId).then(({ prompt, source }) => {
        console.error(`[prompt-builder] master prompt: ${source}`);
        return prompt;
      }),
    );
  }
  return promptByProvider.get(providerId);
}

export default async function ({ vars, provider }) {
  const masterPrompt = await resolveMasterPrompt(provider?.id ?? process.env.EVAL_PROVIDER);
  const escaped = masterPrompt.replaceAll('{{', '{% raw %}{{').replaceAll('}}', '}}{% endraw %}');

  return [
    { role: 'system', content: escaped },
    { role: 'user', content: vars.request },
  ];
}
