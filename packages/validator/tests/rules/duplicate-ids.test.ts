import { describe, it, expect } from 'vitest';
import { duplicateIdsRule } from '../../src/rules/duplicate-ids.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(
  index: number,
  data: Record<string, unknown> | null,
): ParsedBlock {
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
      if (!idMap.has(block.data.id)) {
        idMap.set(block.data.id, block.index);
      }
    }
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('duplicate-ids rule', () => {
  it('passes when all IDs are unique', () => {
    const ctx = createContext([
      createBlock(0, { id: 'form-1', type: 'form', fields: [] }),
      createBlock(1, { id: 'btn-1', type: 'button', text: 'Go' }),
    ]);
    duplicateIdsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags duplicate IDs', () => {
    const ctx = createContext([
      createBlock(0, { id: 'notice', type: 'callout', content: 'A' }),
      createBlock(1, { id: 'notice', type: 'callout', content: 'B' }),
    ]);
    duplicateIdsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('duplicate-ids');
    expect(ctx.issues[0].severity).toBe('error');
    expect(ctx.issues[0].componentId).toBe('notice');
    expect(ctx.issues[0].blockIndex).toBe(1);
  });

  it('flags multiple duplicates of the same ID', () => {
    const ctx = createContext([
      createBlock(0, { id: 'x', type: 'callout', content: 'A' }),
      createBlock(1, { id: 'x', type: 'callout', content: 'B' }),
      createBlock(2, { id: 'x', type: 'callout', content: 'C' }),
    ]);
    duplicateIdsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2);
  });

  it('skips blocks with null data', () => {
    const ctx = createContext([
      createBlock(0, null),
      createBlock(1, { id: 'ok', type: 'callout', content: 'fine' }),
    ]);
    duplicateIdsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
