import { describe, it, expect } from 'vitest';
import { flowOrderingRule } from '../../src/rules/flow-ordering.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown>): ParsedBlock {
  return { index, rawYaml: '', data, startOffset: 0, endOffset: 0, yamlStartOffset: 0, yamlEndOffset: 0 };
}

function createContext(blocks: ParsedBlock[]): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') idMap.set(block.data.id, block.index);
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('flow-ordering rule', () => {
  it('passes for forward-only references', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [], onSubmit: 'btn' }),
      createBlock(1, { type: 'button', id: 'btn', text: 'Go' }),
    ]);
    flowOrderingRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags backward references', () => {
    const ctx = createContext([
      createBlock(0, { type: 'webhook', id: 'wh', url: 'https://api.example.com', trigger: 'btn' }),
      createBlock(1, { type: 'button', id: 'btn', text: 'Go', onAction: 'wh' }),
    ]);
    flowOrderingRule.validate(ctx);
    // wh.trigger → btn is a forward ref (btn at index 1 > wh at index 0): OK
    // btn.onAction → wh is a backward ref (wh at index 0 < btn at index 1): flagged
    const backwardIssues = ctx.issues.filter((i) => i.message.includes('backward'));
    expect(backwardIssues.length).toBeGreaterThan(0);
  });

  it('detects circular references', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'a', fields: [], onSubmit: 'b' }),
      createBlock(1, { type: 'form', id: 'b', fields: [], onSubmit: 'a' }),
    ]);
    flowOrderingRule.validate(ctx);
    const cycleIssues = ctx.issues.filter((i) => i.message.includes('Circular'));
    expect(cycleIssues).toHaveLength(1);
  });

  it('ignores unknown target IDs', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [], onSubmit: 'nonexistent' }),
    ]);
    flowOrderingRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('all issues have info severity', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'a', fields: [], onSubmit: 'b' }),
      createBlock(1, { type: 'form', id: 'b', fields: [], onSubmit: 'a' }),
    ]);
    flowOrderingRule.validate(ctx);
    expect(ctx.issues.every((i) => i.severity === 'info')).toBe(true);
  });
});
