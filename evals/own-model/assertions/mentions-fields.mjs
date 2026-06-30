/**
 * Asserts that the generated prompt mentions a minimum percentage of the
 * configured field names.
 *
 * config.fields: string[]  — field names to look for
 * config.minRatio: number  — minimum ratio of fields that must appear (default: 0.5)
 */
export default function (output, { config }) {
  const fields = config?.fields || [];
  const minRatio = config?.minRatio ?? 0.5;

  if (fields.length === 0) {
    return { pass: true, score: 1, reason: 'No fields to check' };
  }

  const lower = output.toLowerCase();
  const found = fields.filter((f) => lower.includes(f.toLowerCase()));
  const ratio = found.length / fields.length;

  if (ratio >= minRatio) {
    return {
      pass: true,
      score: ratio,
      reason: `Found ${found.length}/${fields.length} field names (${(ratio * 100).toFixed(0)}%)`,
    };
  }

  const missing = fields.filter((f) => !lower.includes(f.toLowerCase()));
  return {
    pass: false,
    score: ratio,
    reason: `Only found ${found.length}/${fields.length} field names (need ${(minRatio * 100).toFixed(0)}%). Missing: ${missing.join(', ')}`,
  };
}
