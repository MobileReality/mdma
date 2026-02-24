/**
 * Asserts that the first mdma block is a thinking component.
 */
export default function (output) {
  const blocks = [...output.matchAll(/```mdma\n([\s\S]*?)```/g)];
  if (blocks.length === 0) {
    return { pass: false, score: 0, reason: 'No mdma blocks found' };
  }
  const firstBlock = blocks[0][1];
  if (firstBlock.includes('type: thinking')) {
    return { pass: true, score: 1, reason: 'Thinking block is first' };
  }
  return { pass: false, score: 0, reason: 'First mdma block is not a thinking component' };
}
