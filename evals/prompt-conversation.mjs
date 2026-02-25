import { buildSystemPrompt } from '@mdma/prompt-pack';

/**
 * Promptfoo prompt function for multi-turn conversation tests.
 *
 * Builds the MDMA author system prompt (with optional customPrompt),
 * replays any prior conversation turns from `_conversation`,
 * and appends the current user message.
 */
export default function ({ vars }) {
  const systemPrompt = buildSystemPrompt(
    vars.customPrompt ? { customPrompt: vars.customPrompt } : undefined,
  );

  const escaped = systemPrompt
    .replaceAll('{{', '{% raw %}{{')
    .replaceAll('}}', '}}{% endraw %}');

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
