import { validate } from '@mobile-reality/mdma-validator';

/**
 * Custom promptfoo assertion that runs the MDMA validator on LLM output.
 *
 * Returns pass if the validator reports no unfixed errors.
 * On failure, includes a summary of all issues found.
 *
 * Optional config:
 *   - exclude: string[] — additional rule IDs to skip on top of the
 *     always-excluded `thinking-block` rule. Useful when a suite's
 *     blueprints deliberately violate a stylistic rule (e.g.
 *     `flow-ordering` for the custom-prompt suite, where prompts
 *     intentionally bundle multiple components per message).
 */
export default function (output, { config } = {}) {
  const extraExclude = Array.isArray(config?.exclude) ? config.exclude : [];
  const result = validate(output, {
    exclude: ['thinking-block', ...extraExclude],
    autoFix: false,
  });

  if (result.ok) {
    return {
      pass: true,
      score: 1,
      reason: `Valid MDMA document (${result.summary.warnings} warnings, ${result.summary.infos} info)`,
    };
  }

  const errorDetails = result.issues
    .filter((issue) => issue.severity === 'error')
    .map((issue) => `[${issue.ruleId}] ${issue.message}`)
    .join('\n');

  return {
    pass: false,
    score: 0,
    reason: `Validation failed with ${result.summary.errors} error(s):\n${errorDetails}`,
  };
}
