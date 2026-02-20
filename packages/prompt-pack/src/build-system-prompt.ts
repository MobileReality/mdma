import { MDMA_AUTHOR_PROMPT } from './prompts/mdma-author.js';

export interface BuildSystemPromptOptions {
  /** Custom system prompt to merge with MDMA instructions. */
  customPrompt?: string;
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
  const { customPrompt } = options;

  if (!customPrompt) {
    return MDMA_AUTHOR_PROMPT;
  }

  return `${MDMA_AUTHOR_PROMPT}

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
