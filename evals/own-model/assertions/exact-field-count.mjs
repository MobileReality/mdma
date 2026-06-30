/**
 * Asserts that a form contains exactly N fields (using `- name:` occurrences).
 *
 * Uses `config.expected` as the expected count.
 * Tolerant: passes if count matches exactly.
 */
export default function (output, { config }) {
  const expected = config.expected;
  if (!expected) {
    return { pass: false, score: 0, reason: 'No config.expected (field count) provided' };
  }

  // Count field definitions inside mdma blocks
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];
  const formBlocks = blocks.filter((b) => b[1].includes('type: form'));

  let totalFields = 0;
  for (const block of formBlocks) {
    const fieldNames = block[1].match(/- name:/g) || [];
    totalFields += fieldNames.length;
  }

  if (totalFields === expected) {
    return { pass: true, score: 1, reason: `Exactly ${expected} form fields found` };
  }

  return {
    pass: false,
    score: totalFields > expected ? 0.5 : totalFields / expected,
    reason: `Expected exactly ${expected} form fields, found ${totalFields}`,
  };
}
