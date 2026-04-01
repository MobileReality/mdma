import { validate } from '@mobile-reality/mdma-validator';

/**
 * Custom promptfoo assertion for fixer eval.
 *
 * Validates that the LLM-fixed output:
 * 1. Contains at least one mdma block (didn't strip everything)
 * 2. Has zero unfixed errors after validation
 * 3. Reports remaining warnings/infos for transparency
 *
 * The config.maxWarnings option (default: Infinity) allows tests to assert
 * that the fixer also resolved warnings.
 */
export default function (output, { config } = {}) {
  const maxWarnings = config?.maxWarnings ?? Infinity;

  // Check the output actually contains mdma blocks
  const blockCount = (output.match(/```mdma/g) ?? []).length;
  if (blockCount === 0) {
    return {
      pass: false,
      score: 0,
      reason: 'Fixer output contains no ```mdma blocks — the LLM may have stripped the document',
    };
  }

  const result = validate(output, {
    exclude: ['thinking-block'],
    autoFix: false,
  });

  const unfixedErrors = result.issues.filter((i) => i.severity === 'error');
  const unfixedWarnings = result.issues.filter((i) => i.severity === 'warning');

  if (unfixedErrors.length > 0) {
    const details = unfixedErrors
      .map((i) => `[${i.ruleId}] ${i.componentId ?? '?'}: ${i.message}`)
      .join('\n');
    return {
      pass: false,
      score: 0,
      reason: `Fixer output still has ${unfixedErrors.length} error(s):\n${details}`,
    };
  }

  if (unfixedWarnings.length > maxWarnings) {
    const details = unfixedWarnings
      .map((i) => `[${i.ruleId}] ${i.componentId ?? '?'}: ${i.message}`)
      .join('\n');
    return {
      pass: false,
      score: 0.5,
      reason: `Fixer output has ${unfixedWarnings.length} warning(s) (max ${maxWarnings}):\n${details}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `Fixer resolved all errors (${result.summary.warnings} warnings, ${result.summary.infos} info, ${blockCount} blocks)`,
  };
}
