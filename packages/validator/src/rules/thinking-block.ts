import type { ValidationRule } from '../types.js';

export const thinkingBlockRule: ValidationRule = {
  id: 'thinking-block',
  name: 'Thinking Block',
  description: 'Checks that the document starts with a thinking block',
  defaultSeverity: 'warning',

  validate(context) {
    const parsedBlocks = context.blocks.filter((b) => b.data !== null);
    if (parsedBlocks.length === 0) return;

    const hasThinking = parsedBlocks.some(
      (b) => b.data?.type === 'thinking',
    );

    if (!hasThinking) {
      context.issues.push({
        ruleId: 'thinking-block',
        severity: 'warning',
        message:
          'Document should include a thinking block to show AI reasoning. Add a thinking component with status: done and collapsed: true.',
        componentId: null,
        blockIndex: 0,
        fixed: false,
      });
      return;
    }

    const first = parsedBlocks[0];
    if (first.data?.type !== 'thinking') {
      context.issues.push({
        ruleId: 'thinking-block',
        severity: 'info',
        message:
          'Thinking block should be the first component in the document',
        componentId:
          typeof first.data?.id === 'string' ? first.data.id : null,
        blockIndex: first.index,
        fixed: false,
      });
    }
  },
};
