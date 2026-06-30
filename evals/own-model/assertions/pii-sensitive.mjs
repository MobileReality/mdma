/**
 * Asserts that at least 3 fields are marked sensitive: true (email, phone, SSN).
 */
export default function (output, context) {
  const matches = output.match(/sensitive:\s*true/g) || [];
  if (matches.length >= 3) {
    return { pass: true, score: 1, reason: `Found ${matches.length} sensitive flags` };
  }
  return {
    pass: false,
    score: matches.length / 3,
    reason: `Expected at least 3 sensitive: true flags, found ${matches.length}`,
  };
}
