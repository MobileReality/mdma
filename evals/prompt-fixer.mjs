import {
  buildFixerPrompt,
  buildFixerMessage,
  buildSystemPrompt,
} from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';

/**
 * Promptfoo prompt function for fixer eval tests.
 *
 * Each test case provides:
 * - `brokenDocument` — MDMA markdown with intentional issues
 * - `conversationHistory` (optional) — prior messages for multi-step context
 * - `promptContext` (optional) — the original prompt that describes expected structure
 * - `variantKey` (optional) — validator variant key to select relevant fixer extensions
 *
 * This function:
 * 1. Runs the validator (with autoFix) to fix what it can
 * 2. Collects remaining unfixed issues
 * 3. Sends the fixer system prompt (with variant-specific extensions) + user message
 */
export default function ({ vars }) {
  const result = validate(vars.brokenDocument, { exclude: ['thinking-block'] });
  const unfixed = result.issues.filter(
    (i) => !i.fixed && (i.severity === 'error' || i.severity === 'warning'),
  );

  const fixerPrompt = buildFixerPrompt(vars.variantKey ?? undefined);
  const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${fixerPrompt}`;

  const userMessage = buildFixerMessage(result.output, unfixed, {
    conversationHistory: vars.conversationHistory ?? undefined,
    promptContext: vars.promptContext ?? undefined,
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${userMessage}{% endraw %}` },
  ];
}
