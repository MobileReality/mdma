import { MDMA_AUTHOR_PROMPT } from './prompts/mdma-author/default.js';

export interface BuildSystemPromptOptions {
  /** Custom system prompt to merge with MDMA instructions. */
  customPrompt?: string;
  /**
   * Override the base MDMA author prompt. Defaults to the canonical
   * `MDMA_AUTHOR_PROMPT`. Use to swap in a model-specialized variant
   * (e.g. `MDMA_AUTHOR_PROMPT_HAIKU` from `./prompts/mdma-author/anthropic/haiku.js`).
   */
  authorPrompt?: string;
}

/**
 * Build a complete system prompt that always includes MDMA formatting
 * instructions. When a custom prompt is provided, it is placed between
 * the MDMA specification and a closing reminder that reinforces critical
 * rules (thinking block, unique IDs, sensitive flags).
 *
 * This ensures that consumers never accidentally lose MDMA instructions
 * when providing their own system prompt.
 */
export function buildSystemPrompt(options: BuildSystemPromptOptions = {}): string {
  const { customPrompt, authorPrompt } = options;
  const author = authorPrompt ?? MDMA_AUTHOR_PROMPT;

  if (!customPrompt) {
    return author;
  }

  return `${author}

---

${customPrompt}

---

Reminder — when generating MDMA components you MUST:
- Include a \`thinking\` block BEFORE the main content (status: done, collapsed: true).
- Use unique kebab-case IDs for every component.
- Mark PII fields with \`sensitive: true\`.
- NEVER mention thinking blocks, sensitive flags, bindings, component IDs, or any MDMA implementation details in your visible text. All reasoning goes inside the thinking block. The user should see a natural response, not meta-commentary about how the document is structured.
- Respond in plain Markdown — do NOT wrap the entire response in code fences.`;
}
