/**
 * Asserts that the output contains at least N fields with required: true.
 * Uses config.min as the minimum count (default: 2).
 */
export default function (output, { config }) {
  const minRequired = config?.min || 2;
  const matches = output.match(/required:\s*true/g) || [];

  if (matches.length >= minRequired) {
    return { pass: true, score: 1, reason: `Found ${matches.length} required fields` };
  }
  return {
    pass: false,
    score: matches.length / minRequired,
    reason: `Expected at least ${minRequired} required: true flags, found ${matches.length}`,
  };
}
