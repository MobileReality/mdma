import { describe, it, expect } from 'vitest';
import { thinkingBlockRule } from '../../src/rules/thinking-block.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown> | null): ParsedBlock {
  return {
    index,
    rawYaml: '',
    data,
    startOffset: 0,
    endOffset: 0,
    yamlStartOffset: 0,
    yamlEndOffset: 0,
  };
}

function createContext(blocks: ParsedBlock[]): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') {
      idMap.set(block.data.id, block.index);
    }
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('thinking-block rule', () => {
  it('passes when thinking block is the first component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'thinking',
        id: 'reasoning',
        content: 'Analyzing the request...',
        status: 'done',
        collapsed: true,
      }),
      createBlock(1, {
        type: 'form',
        id: 'f',
        fields: [],
      }),
    ]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('does not warn when no thinking block exists', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [],
      }),
    ]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('gives info when thinking block exists but is not first', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [],
      }),
      createBlock(1, {
        type: 'thinking',
        id: 'reasoning',
        content: 'Thinking...',
        status: 'done',
        collapsed: true,
      }),
    ]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('info');
    expect(ctx.issues[0].message).toContain('first');
  });

  it('flags duplicate thinking blocks', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'thinking',
        id: 'reasoning-1',
        content: 'First reasoning...',
        status: 'done',
        collapsed: true,
      }),
      createBlock(1, {
        type: 'form',
        id: 'f',
        fields: [],
      }),
      createBlock(2, {
        type: 'thinking',
        id: 'reasoning-2',
        content: 'Second reasoning...',
        status: 'done',
        collapsed: true,
      }),
    ]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('Duplicate thinking block');
    expect(ctx.issues[0].message).toContain('reasoning-2');
  });

  it('flags all extra thinking blocks when there are three', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'thinking',
        id: 't-1',
        content: 'First',
        status: 'done',
        collapsed: true,
      }),
      createBlock(1, {
        type: 'thinking',
        id: 't-2',
        content: 'Second',
        status: 'done',
        collapsed: true,
      }),
      createBlock(2, {
        type: 'thinking',
        id: 't-3',
        content: 'Third',
        status: 'done',
        collapsed: true,
      }),
    ]);
    thinkingBlockRule.validate(ctx);
    const dupes = ctx.issues.filter((i) => i.message.includes('Duplicate'));
    expect(dupes).toHaveLength(2);
    expect(dupes[0].message).toContain('t-2');
    expect(dupes[1].message).toContain('t-3');
  });

  it('skips validation when there are no parsed blocks', () => {
    const ctx = createContext([createBlock(0, null)]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips validation when document is empty', () => {
    const ctx = createContext([]);
    thinkingBlockRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
