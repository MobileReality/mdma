/**
 * Custom promptfoo assertion for fixer eval.
 *
 * Verifies that the fixer didn't drop components. The fixed output
 * should contain at least config.min mdma blocks (default: same as input).
 */
export default function (output, { config } = {}) {
  const min = config?.min ?? 1;
  const blockCount = (output.match(/```mdma/g) ?? []).length;

  if (blockCount < min) {
    return {
      pass: false,
      score: 0,
      reason: `Fixer output has ${blockCount} mdma block(s) but expected at least ${min}`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `Fixer preserved ${blockCount} mdma block(s) (min: ${min})`,
  };
}
