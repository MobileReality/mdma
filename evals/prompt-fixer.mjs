import {
  buildFixerPrompt,
  buildFixerMessage,
  buildSystemPrompt,
} from '@mobile-reality/mdma-prompt-pack';
import { validate } from '@mobile-reality/mdma-validator';
import { DATA_SOURCES, toCatalog } from './data-sources.mjs';
import { selectFixerPrompt } from './select-prompt.mjs';

/**
 * Promptfoo prompt function for fixer eval tests.
 *
 * Each test case provides:
 * - `brokenDocument` — MDMA markdown with intentional issues
 * - `conversationHistory` (optional) — prior messages for multi-step context
 * - `promptContext` (optional) — the original prompt that describes expected structure
 * - `dataSources` (optional) — `true` to validate against and advertise the eval data-source catalog
 * - `variantKey` (optional) — validator variant key to select relevant fixer extensions
 *
 * This function:
 * 1. Runs the validator (with autoFix) to fix what it can
 * 2. Collects remaining unfixed issues
 * 3. Sends the fixer system prompt (with variant-specific extensions) + user message
 */
export default async function ({ vars, provider }) {
  // Default to single-block scope unless the test explicitly opts into
  // multi-step (variantKey: 'flow'). For single-block tests we also drop
  // the flow-ordering rule from validate() since by design each test has
  // exactly one mdma block — no multi-step ordering to check.
  const variantKey = vars.variantKey ?? 'single-block';
  const exclude = ['thinking-block'];
  if (variantKey !== 'flow') exclude.push('flow-ordering');

  const withDataSources = vars.dataSources === true || vars.dataSources === 'true';
  const result = validate(vars.brokenDocument, {
    exclude,
    ...(withDataSources ? { dataSourceCatalog: toCatalog() } : {}),
  });
  const allIssues = result.issues.filter((i) => i.severity === 'error' || i.severity === 'warning');

  const { prompt: variantPrompt, source: fixerSource } = await selectFixerPrompt(
    provider?.id ?? process.env.EVAL_PROVIDER,
  );
  const fixerPrompt = fixerSource.startsWith('default')
    ? buildFixerPrompt(variantKey)
    : variantPrompt;
  const systemPrompt = `${buildSystemPrompt()}\n\n---\n\n${fixerPrompt}`;

  // Pass the original broken document (not auto-fixed output) so the model
  // sees every issue in full context, including ones the auto-fixer silently
  // stripped (e.g. removing onSubmit instead of repairing the broken target).
  const userMessage = buildFixerMessage(vars.brokenDocument, allIssues, {
    conversationHistory: vars.conversationHistory ?? undefined,
    promptContext: vars.promptContext ?? undefined,
    ...(withDataSources ? { dataSources: DATA_SOURCES } : {}),
  });

  return [
    { role: 'system', content: `{% raw %}${systemPrompt}{% endraw %}` },
    { role: 'user', content: `{% raw %}${userMessage}{% endraw %}` },
  ];
}
