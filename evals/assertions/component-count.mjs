/**
 * Asserts that the output contains at least N mdma components.
 * Uses config.min as the minimum count (default: 5).
 */
export default function (output, { config }) {
  const min = config?.min || 5;
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];

  if (blocks.length >= min) {
    return { pass: true, score: 1, reason: `Found ${blocks.length} components (min: ${min})` };
  }
  return {
    pass: false,
    score: blocks.length / min,
    reason: `Expected at least ${min} components, found ${blocks.length}`,
  };
}
