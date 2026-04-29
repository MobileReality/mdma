/**
 * Asserts that the output contains a form with a file-typed field.
 *
 * Optional config:
 *   - sensitive: boolean — asserts the file field sets `sensitive: true`
 *
 * Note: `accept` and `multiple` are renderer-level concerns and are NOT part
 * of the MDMA spec, so they are not asserted here.
 */
export default function (output, { config } = {}) {
  const blockRegex = /```mdma\n([\s\S]*?)```/g;
  const blocks = [...output.matchAll(blockRegex)].map((m) => m[1]);

  const formBlocks = blocks.filter((b) => /^type:\s*form/m.test(b));
  if (formBlocks.length === 0) {
    return { pass: false, score: 0, reason: 'No form block found in output' };
  }

  const fileBlock = formBlocks.find((b) => /type:\s*file\b/.test(b));
  if (!fileBlock) {
    return {
      pass: false,
      score: 0,
      reason: 'No form field with `type: file` found',
    };
  }

  const reasons = ['Form contains a file field'];

  if (config?.sensitive === true) {
    const sensitivePattern = /type:\s*file[\s\S]{0,200}sensitive:\s*true/;
    if (!sensitivePattern.test(fileBlock)) {
      return {
        pass: false,
        score: 0,
        reason: 'File field expected sensitive: true but not found',
      };
    }
    reasons.push('sensitive: true');
  }

  return { pass: true, score: 1, reason: reasons.join('; ') };
}
