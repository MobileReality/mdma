/**
 * Asserts that specific field names are still present in the output.
 *
 * Used to verify that after a user requests an adjustment (e.g. tone change),
 * the original fields defined in the MDMA document are preserved.
 *
 * Expects `assertion.value` to be a comma-separated list of field names/keywords
 * that must all be present in the output.
 */
export default function (output, { assertion }) {
  const requiredFields = assertion.value
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);

  const missing = requiredFields.filter(
    (field) => !output.toLowerCase().includes(field.toLowerCase()),
  );

  if (missing.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: `All ${requiredFields.length} fields preserved: ${requiredFields.join(', ')}`,
    };
  }

  return {
    pass: false,
    score: (requiredFields.length - missing.length) / requiredFields.length,
    reason: `Missing fields after adjustment: ${missing.join(', ')}`,
  };
}
