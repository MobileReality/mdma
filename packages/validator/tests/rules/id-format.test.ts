import { describe, it, expect } from 'vitest';
import { idFormatRule } from '../../src/rules/id-format.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown>): ParsedBlock {
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

describe('id-format rule', () => {
  it('passes for kebab-case IDs', () => {
    const ctx = createContext([
      createBlock(0, { id: 'my-form', type: 'form' }),
      createBlock(1, { id: 'submit-btn', type: 'button' }),
    ]);
    idFormatRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags camelCase IDs', () => {
    const ctx = createContext([createBlock(0, { id: 'myForm', type: 'form' })]);
    idFormatRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('id-format');
  });

  it('flags snake_case IDs', () => {
    const ctx = createContext([createBlock(0, { id: 'my_form', type: 'form' })]);
    idFormatRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
  });

  it('flags UPPERCASE IDs', () => {
    const ctx = createContext([createBlock(0, { id: 'LOUD-BUTTON', type: 'button' })]);
    idFormatRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
  });
});
