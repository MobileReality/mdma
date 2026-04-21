import { describe, it, expect } from 'vitest';
import { fixThinkingBlock } from '../../src/fixes/thinking-block.js';
import type { FixContext, ParsedBlock, ValidationIssue } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown> | null): ParsedBlock {
  return {
    index,
    rawYaml: '',
    data,
    startOffset: index * 100,
    endOffset: index * 100 + 50,
    yamlStartOffset: index * 100 + 10,
    yamlEndOffset: index * 100 + 45,
  };
}

function createFixContext(blocks: ParsedBlock[], issues: ValidationIssue[] = []): FixContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') {
      idMap.set(block.data.id, block.index);
    }
  }
  return { blocks, idMap, issues, options: {} };
}

describe('fixThinkingBlock', () => {
  it('does nothing with a single thinking block', () => {
    const ctx = createFixContext([
      createBlock(0, { type: 'thinking', id: 't1', content: 'Reasoning...', status: 'done', collapsed: true }),
      createBlock(1, { type: 'form', id: 'f1', fields: [] }),
    ]);
    fixThinkingBlock(ctx);
    const thinkingBlocks = ctx.blocks.filter((b) => b.data?.type === 'thinking');
    expect(thinkingBlocks).toHaveLength(1);
    expect(thinkingBlocks[0].data?.content).toBe('Reasoning...');
  });

  it('merges two thinking blocks into one', () => {
    const ctx = createFixContext([
      createBlock(0, { type: 'thinking', id: 't1', content: 'First reasoning', status: 'done', collapsed: true }),
      createBlock(1, { type: 'form', id: 'f1', fields: [] }),
      createBlock(2, { type: 'thinking', id: 't2', content: 'Second reasoning', status: 'done', collapsed: true }),
    ]);
    fixThinkingBlock(ctx);
    const thinkingBlocks = ctx.blocks.filter((b) => b.data?.type === 'thinking');
    expect(thinkingBlocks).toHaveLength(1);
    expect(thinkingBlocks[0].data?.content).toBe('First reasoning\n\nSecond reasoning');
  });

  it('merges three thinking blocks into one', () => {
    const ctx = createFixContext([
      createBlock(0, { type: 'thinking', id: 't1', content: 'A', status: 'done', collapsed: true }),
      createBlock(1, { type: 'thinking', id: 't2', content: 'B', status: 'done', collapsed: true }),
      createBlock(2, { type: 'thinking', id: 't3', content: 'C', status: 'done', collapsed: true }),
    ]);
    fixThinkingBlock(ctx);
    const thinkingBlocks = ctx.blocks.filter((b) => b.data?.type === 'thinking');
    expect(thinkingBlocks).toHaveLength(1);
    expect(thinkingBlocks[0].data?.content).toBe('A\n\nB\n\nC');
  });

  it('moves merged thinking block to the top', () => {
    const ctx = createFixContext([
      createBlock(0, { type: 'form', id: 'f1', fields: [] }),
      createBlock(1, { type: 'thinking', id: 't1', content: 'First', status: 'done', collapsed: true }),
      createBlock(2, { type: 'thinking', id: 't2', content: 'Second', status: 'done', collapsed: true }),
    ]);
    fixThinkingBlock(ctx);
    // First parsed block should now be thinking
    const firstParsed = ctx.blocks.find((b) => b.data !== null);
    expect(firstParsed?.data?.type).toBe('thinking');
    expect(firstParsed?.data?.content).toBe('First\n\nSecond');
  });

  it('marks thinking-block issues as fixed', () => {
    const issues: ValidationIssue[] = [
      {
        ruleId: 'thinking-block',
        severity: 'warning',
        message: 'Duplicate thinking block "t2"',
        componentId: 't2',
        blockIndex: 2,
        fixed: false,
      },
    ];
    const ctx = createFixContext(
      [
        createBlock(0, { type: 'thinking', id: 't1', content: 'A', status: 'done', collapsed: true }),
        createBlock(1, { type: 'form', id: 'f1', fields: [] }),
        createBlock(2, { type: 'thinking', id: 't2', content: 'B', status: 'done', collapsed: true }),
      ],
      issues,
    );
    fixThinkingBlock(ctx);
    expect(issues[0].fixed).toBe(true);
  });
});
