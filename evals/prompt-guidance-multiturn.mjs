import { buildSystemPrompt, getAgentToolPromptVariant } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';

/**
 * Multi-turn guidance eval prompt — same setup as prompt-guidance.mjs, but
 * threads a prior `conversationHistory` before the current user turn so the
 * eval measures the tool-call decision IN CONTEXT (e.g. "thanks" after a
 * document was shown must NOT call; "now add a field" must call).
 *
 * The tool is defined at the provider level in promptfooconfig.guidance-multiturn.js.
 */

const promptByProvider = new Map();

function resolveSystemPrompt(providerId) {
  if (!promptByProvider.has(providerId)) {
    promptByProvider.set(
      providerId,
      selectAuthorPrompt(providerId).then(({ prompt, source }) => {
        console.error(`[guidance-multiturn] system prompt: ${source}`);
        const agentToolPrompt = getAgentToolPromptVariant(source).prompt;
        return buildSystemPrompt({ authorPrompt: prompt, customPrompt: agentToolPrompt });
      }),
    );
  }
  return promptByProvider.get(providerId);
}

export default async function ({ vars, provider }) {
  const systemPrompt = await resolveSystemPrompt(provider?.id ?? process.env.EVAL_PROVIDER);
  const history = Array.isArray(vars.conversationHistory) ? vars.conversationHistory : [];

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    ...history.map((m) => ({ role: m.role, content: `{% raw %}${m.content}{% endraw %}` })),
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
