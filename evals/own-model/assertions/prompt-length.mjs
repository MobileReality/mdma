/**
 * Asserts that the generated customPrompt is within a reasonable length range.
 *
 * config.min: minimum chars (default 200)
 * config.max: maximum chars (default 8000)
 */
export default function (output, { config }) {
  const min = config?.min ?? 200;
  const max = config?.max ?? 8000;
  const len = output.length;

  if (len < min) {
    return {
      pass: false,
      score: len / min,
      reason: `Output too short: ${len} chars (minimum ${min})`,
    };
  }

  if (len > max) {
    return {
      pass: false,
      score: max / len,
      reason: `Output too long: ${len} chars (maximum ${max})`,
    };
  }

  return {
    pass: true,
    score: 1,
    reason: `Output length ${len} chars (within ${min}-${max})`,
  };
}
