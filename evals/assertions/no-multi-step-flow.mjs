import { validate } from '@mobile-reality/mdma-validator';

/**
 * Custom promptfoo assertion for fixer eval.
 *
 * Verifies that the fixer output has no flow-ordering errors.
 * This relies on the validator's own logic for detecting multi-step
 * flows, circular references, and multiple interactive types.
 */
export default function (output) {
  const result = validate(output, {
    exclude: ['thinking-block'],
    autoFix: false,
  });

  const flowErrors = result.issues.filter(
    (i) => i.ruleId === 'flow-ordering' && i.severity === 'error',
  );

  if (flowErrors.length > 0) {
    return {
      pass: false,
      score: 0,
      reason: `Fixer output still has ${flowErrors.length} flow-ordering error(s):\n${flowErrors.map((i) => i.message).join('\n')}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: 'No flow-ordering errors',
  };
}
