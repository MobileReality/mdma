import type { FixContext } from '../types.js';

/**
 * Merge multiple thinking blocks into a single one at the top of the document.
 * Concatenates content from all thinking blocks, keeps the first one's metadata,
 * and removes the extras.
 */
export function fixThinkingBlock(context: FixContext): void {
  const thinkingIndices: number[] = [];
  for (let i = 0; i < context.blocks.length; i++) {
    if (context.blocks[i].data?.type === 'thinking') {
      thinkingIndices.push(i);
    }
  }

  if (thinkingIndices.length < 2) return;

  // Merge all thinking content into the first block
  const firstBlock = context.blocks[thinkingIndices[0]];
  if (!firstBlock.data) return;

  const mergedContent: string[] = [];
  for (const idx of thinkingIndices) {
    const block = context.blocks[idx];
    if (block.data && typeof block.data.content === 'string') {
      mergedContent.push(block.data.content.trim());
    }
  }
  firstBlock.data.content = mergedContent.join('\n\n');
  firstBlock.data.status = 'done';
  firstBlock.data.collapsed = true;

  // Remove extra thinking blocks (iterate in reverse to preserve indices)
  for (let i = thinkingIndices.length - 1; i >= 1; i--) {
    const idx = thinkingIndices[i];
    context.blocks[idx].data = null;
  }

  // Move the merged thinking block to the top if it's not already first
  const firstParsedIdx = context.blocks.findIndex((b) => b.data !== null);
  if (firstParsedIdx !== thinkingIndices[0] && firstParsedIdx >= 0) {
    // Swap: put thinking block data into the first parsed block position
    const thinkingData = firstBlock.data;
    const targetBlock = context.blocks[firstParsedIdx];
    firstBlock.data = targetBlock.data;
    targetBlock.data = thinkingData;
  }

  // Mark thinking-block issues as fixed
  for (const issue of context.issues) {
    if (issue.ruleId === 'thinking-block' && !issue.fixed) {
      issue.fixed = true;
    }
  }
}
