import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { selectAuthorPrompt } from './select-prompt.mjs';

/**
 * Promptfoo prompt function for multi-turn conversation tests.
 *
 * Builds the MDMA author system prompt (with optional customPrompt),
 * replays any prior conversation turns from `_conversation`,
 * and appends the current user message.
 *
 * The author prompt base is resolved from `EVAL_PROVIDER` — model-specialized
 * variants under `mdma-author/<family>/<model>.ts` win over the default.
 * Selector falls back to the canonical `MDMA_AUTHOR_PROMPT` when no variant
 * matches. Resolution is deferred into a promise (no top-level await — tsx/cjs
 * forbids it) and cached so the selector runs only once per eval run.
 */
const authorPromptPromise = selectAuthorPrompt().then(({ prompt, source }) => {
  console.error(`[author-conversation] system prompt: ${source}`);
  return prompt;
});

export default async function ({ vars }) {
  const authorPrompt = await authorPromptPromise;
  const systemPrompt = buildSystemPrompt({
    authorPrompt,
    customPrompt: vars.customPrompt,
  });

  const escaped = systemPrompt.replaceAll('{{', '{% raw %}{{').replaceAll('}}', '}}{% endraw %}');

  const messages = [{ role: 'system', content: escaped }];

  // Replay prior turns if _conversation is available
  if (vars._conversation) {
    for (const turn of vars._conversation) {
      messages.push({ role: 'user', content: turn.input });
      messages.push({ role: 'assistant', content: turn.output });
    }
  }

  messages.push({ role: 'user', content: vars.message });

  return messages;
}
