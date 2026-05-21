import { MDMA_CONVERSATION_JUDGE } from '@mobile-reality/mdma-prompt-pack';

/**
 * Promptfoo prompt loader for the conversation-judge eval.
 *
 * Each test provides:
 *   - `customPrompt` — the flow definition (steps, ids, order)
 *   - `conversation` — array of `{ role: 'user' | 'assistant', content: string }`
 *     turns in chronological order
 *   - `expectedJudgment` — 'valid' | 'invalid' (consumed by the assertion,
 *     not the LLM)
 *
 * The LLM under test acts as the judge and outputs a JSON
 * { valid, issues[] } per the system prompt's contract.
 */
export default function ({ vars }) {
  const conversation = Array.isArray(vars.conversation) ? vars.conversation : [];

  const renderedConversation = conversation
    .map((turn, i) => {
      const role = turn.role === 'assistant' ? 'Assistant' : 'User';
      return `### Message ${i} — ${role}\n\n${turn.content ?? ''}`;
    })
    .join('\n\n');

  const userMessage = `## Flow definition (custom prompt)

${vars.customPrompt ?? '(no custom prompt provided)'}

## Conversation (${conversation.length} message${conversation.length === 1 ? '' : 's'})

${renderedConversation}

---

Judge whether the conversation above correctly implements the flow defined in the custom prompt. Output only the JSON object specified in your instructions.`;

  return [
    { role: 'system', content: `{% raw %}${MDMA_CONVERSATION_JUDGE}{% endraw %}` },
    { role: 'user', content: `{% raw %}${userMessage}{% endraw %}` },
  ];
}
