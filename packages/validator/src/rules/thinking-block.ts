import type { ValidationRule } from '../types.js';

export const thinkingBlockRule: ValidationRule = {
  id: 'thinking-block',
  name: 'Thinking Block',
  description: 'Checks that the document starts with a thinking block',
  defaultSeverity: 'warning',

  validate(context) {
    const parsedBlocks = context.blocks.filter((b) => b.data !== null);
    if (parsedBlocks.length === 0) return;

    const thinkingBlocks = parsedBlocks.filter((b) => b.data?.type === 'thinking');

    // Only validate if a thinking block was actually generated
    if (thinkingBlocks.length === 0) return;

    const first = parsedBlocks[0];
    if (first.data?.type !== 'thinking') {
      context.issues.push({
        ruleId: 'thinking-block',
        severity: 'info',
        message: 'Thinking block should be the first component in the document',
        componentId: typeof first.data?.id === 'string' ? first.data.id : null,
        blockIndex: first.index,
        fixed: false,
      });
    }

    if (thinkingBlocks.length > 1) {
      for (const block of thinkingBlocks.slice(1)) {
        const id = typeof block.data?.id === 'string' ? block.data.id : null;
        context.issues.push({
          ruleId: 'thinking-block',
          severity: 'warning',
          message: `Duplicate thinking block "${id ?? `block ${block.index}`}" — only one thinking block should exist per document`,
          componentId: id,
          blockIndex: block.index,
          fixed: false,
        });
      }
    }
  },
};
