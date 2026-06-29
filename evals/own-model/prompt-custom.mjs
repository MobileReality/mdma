import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { AUTHORING_SYSTEM_PROMPT } from './authoring-system-prompt.mjs';

/**
 * Promptfoo prompt function — custom-system-prompt suite for our model.
 *
 * The shared authoring system prompt (DSL grammar + rules + form/table/chart
 * few-shot examples) is the author base, with the test's `customPrompt` (the
 * scenario intent expressed in DSL, NOT an MDMA blueprint) layered into the
 * SYSTEM message via buildSystemPrompt(); the NL `request` is the user message.
 * buildSystemPrompt() appends the shared output reminder last (thinking block,
 * kebab ids, sensitive PII, respond in Markdown / no outer fence).
 */
export default function ({ vars }) {
  const system = buildSystemPrompt({
    authorPrompt: AUTHORING_SYSTEM_PROMPT,
    customPrompt: vars.customPrompt,
  });
  return [
    { role: 'system', content: `{% raw %}${system}{% endraw %}` },
    { role: 'user', content: `{% raw %}${vars.request}{% endraw %}` },
  ];
}
