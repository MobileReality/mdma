import { validate } from '@mobile-reality/mdma-validator';

/**
 * Custom promptfoo assertion that runs the MDMA validator on LLM output.
 *
 * Returns pass if the validator reports no unfixed errors.
 * On failure, includes a summary of all issues found.
 */
export default function (output) {
  const result = validate(output, {
    exclude: ['thinking-block'],
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
