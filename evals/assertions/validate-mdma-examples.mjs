import { validate } from '@mobile-reality/mdma-validator';

/**
 * Extracts ```mdma blocks from a customPrompt and validates each one
 * as a standalone MDMA document.
 *
 * Unlike validate-mdma.mjs (which validates the entire output as a document),
 * this assertion handles the case where mdma blocks are embedded as examples
 * inside instructional prose.
 */
export default function (output) {
  const blockRegex = /```mdma\n([\s\S]*?)```/g;
  const blocks = [...output.matchAll(blockRegex)];

  if (blocks.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: 'No mdma example blocks to validate (OK for customPrompt)',
    };
  }

  const errors = [];
  let validCount = 0;

  for (let i = 0; i < blocks.length; i++) {
    const blockContent = blocks[i][1].trim();
    // Wrap each block back into a markdown document for the validator
    const doc = `\`\`\`mdma\n${blockContent}\n\`\`\``;

    const result = validate(doc, {
      exclude: ['thinking-block'],
      autoFix: false,
    });

    if (result.ok) {
      validCount++;
    } else {
      const blockErrors = result.issues
        .filter((issue) => issue.severity === 'error')
        .map((issue) => `[${issue.ruleId}] ${issue.message}`)
        .join('; ');
      errors.push(`Block ${i + 1}: ${blockErrors}`);
    }
  }

  if (errors.length === 0) {
    return {
      pass: true,
      score: 1,
      reason: `All ${validCount} mdma example block(s) are valid MDMA`,
    };
  }

  return {
    pass: false,
    score: validCount / blocks.length,
    reason: `${errors.length}/${blocks.length} mdma block(s) have validation errors:\n${errors.join('\n')}`,
  };
}
