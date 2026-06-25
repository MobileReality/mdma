/**
 * Deep validation: checks that generated mdma form blocks contain the
 * expected fields with correct attributes.
 *
 * config.expectedForms: Array of { fields: string[], sensitive?: string[] }
 *   - fields: field names that must appear in the form block
 *   - sensitive: field names that must be marked sensitive: true
 *
 * If multiple expectedForms are provided, they are matched in order to
 * the mdma form blocks found in the output.
 */
export default function (output, { config }) {
  const expectedForms = config?.expectedForms || [];
  if (expectedForms.length === 0) {
    return { pass: true, score: 1, reason: 'No expected forms to check' };
  }

  // Extract all mdma form blocks
  const blockRegex = /```mdma\n([\s\S]*?)```/g;
  const blocks = [...output.matchAll(blockRegex)];
  const formBlocks = blocks.map((b) => b[1].trim()).filter((b) => /^type:\s*form/m.test(b));

  if (formBlocks.length === 0) {
    return {
      pass: false,
      score: 0,
      reason: `Expected ${expectedForms.length} form block(s) but found none`,
    };
  }

  const results = [];
  let totalScore = 0;

  for (let i = 0; i < expectedForms.length; i++) {
    const expected = expectedForms[i];
    const block = formBlocks[i];

    if (!block) {
      results.push(`Form ${i + 1}: missing (expected ${expected.fields.length} fields)`);
      continue;
    }

    const blockLower = block.toLowerCase();

    // Check field names
    const fieldsFound = expected.fields.filter(
      (f) =>
        blockLower.includes(`name: ${f.toLowerCase()}`) ||
        blockLower.includes(`name: "${f.toLowerCase()}"`),
    );
    const fieldScore = fieldsFound.length / expected.fields.length;

    // Check onSubmit is present
    const hasOnSubmit = /onSubmit:\s*\S+/i.test(block);
    if (!hasOnSubmit) {
      results.push(`Form ${i + 1}: missing onSubmit (no submit button)`);
    }

    // Check sensitive flags
    let sensitiveScore = 1;
    if (expected.sensitive && expected.sensitive.length > 0) {
      // For each sensitive field, check that it has sensitive: true nearby
      let sensitiveFound = 0;
      for (const sf of expected.sensitive) {
        // Find the field block and check for sensitive: true
        const fieldPattern = new RegExp(`name:\\s*"?${sf}"?[\\s\\S]{0,200}sensitive:\\s*true`, 'i');
        if (fieldPattern.test(block)) {
          sensitiveFound++;
        }
      }
      sensitiveScore = sensitiveFound / expected.sensitive.length;
    }

    const submitScore = hasOnSubmit ? 1 : 0;
    const formScore = (fieldScore + sensitiveScore + submitScore) / 3;
    totalScore += formScore;

    const missingFields = expected.fields.filter((f) => !fieldsFound.includes(f));
    if (missingFields.length > 0) {
      results.push(
        `Form ${i + 1}: missing fields [${missingFields.join(', ')}] (${fieldsFound.length}/${expected.fields.length} found)`,
      );
    }
    if (sensitiveScore < 1 && expected.sensitive) {
      results.push(
        `Form ${i + 1}: some sensitive flags missing (score: ${sensitiveScore.toFixed(2)})`,
      );
    }
    if (missingFields.length === 0 && sensitiveScore === 1) {
      results.push(`Form ${i + 1}: all ${expected.fields.length} fields correct`);
    }
  }

  const avgScore = totalScore / expectedForms.length;

  return {
    pass: avgScore >= 0.5,
    score: avgScore,
    reason: results.join('; '),
  };
}
