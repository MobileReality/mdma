import { buildSystemPrompt, getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';

/**
 * Guidance eval prompt — mirrors the Agent Chat setup.
 *
 * Uses the same system prompt as the agent (author prompt + tool-use instruction)
 * so the eval tests whether the model correctly decides to call generate_mdma
 * for document-creation requests.
 *
 * The agent tool prompt variant is derived from the author variant id
 * (e.g. "openai/gpt-5.5" → OpenAI function-calling framing).
 *
 * The tool itself is defined in promptfooconfig.guidance.yaml at the provider
 * level so promptfoo includes it in the API request.
 */

const systemPromptPromise = selectAuthorPrompt().then(({ prompt, source }) => {
  console.error(`[guidance] system prompt: ${source}`);
  const agentToolPrompt = getAgentToolPromptVariant(source).prompt;
  return buildSystemPrompt({ authorPrompt: prompt, customPrompt: agentToolPrompt });
});

export default async function ({ vars }) {
  const systemPrompt = await systemPromptPromise;

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
