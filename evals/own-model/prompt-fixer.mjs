import {
  buildFixerMessage,
  buildFixerPrompt,
  buildSystemPrompt,
} from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';

/**
 * Promptfoo prompt function — fixer suite for our model.
 *
 * NOTE: this is OFF-CONTRACT for our model. The model was trained DSL→MDMA;
 * the fixer task takes a BROKEN MDMA document (+ validator errors) and asks the
 * model to repair it — not a DSL intent. We run it anyway as a capability probe:
 * can the DSL-specialized model also repair MDMA, or does it refuse?
 *
 * Pipeline mirrors the flagship fixer eval (../prompt-fixer.mjs): run the
 * validator to surface remaining issues, then send the canonical fixer system
 * prompt (default author spec + fixer instructions) + the broken doc / issues.
 */
export default function ({ vars }) {
  const variantKey = vars.variantKey ?? 'single-block';
  const exclude = ['thinking-block'];
  if (variantKey !== 'flow') exclude.push('flow-ordering');

  const result = validate(vars.brokenDocument, { exclude });
  const allIssues = result.issues.filter((i) => i.severity === 'error' || i.severity === 'warning');

  const fixerPrompt = buildFixerPrompt(variantKey);
  const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${fixerPrompt}`;
  const userMessage = buildFixerMessage(vars.brokenDocument, allIssues, {
    conversationHistory: vars.conversationHistory ?? undefined,
    promptContext: vars.promptContext ?? undefined,
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${userMessage}{% endraw %}` },
  ];
}
