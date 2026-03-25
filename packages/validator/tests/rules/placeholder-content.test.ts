import { describe, it, expect } from 'vitest';
import { placeholderContentRule } from '../../src/rules/placeholder-content.js';
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

describe('placeholder-content rule', () => {
  it('flags "TODO" in title', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: 'real content', title: 'TODO fix this' }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('info');
    expect(ctx.issues[0].field).toBe('title');
  });

  it('flags "..." in content', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: '...' }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].field).toBe('content');
  });

  it('flags "lorem ipsum"', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: 'Lorem ipsum dolor sit amet' }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
  });

  it('passes for normal content', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: 'Please fill in the form below' }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('detects placeholder in form field labels', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form', id: 'f',
        fields: [{ name: 'email', type: 'email', label: 'TBD' }],
      }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].field).toBe('fields[0].label');
  });

  it('detects placeholder in table column headers', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'FIXME' }],
        data: [],
      }),
    ]);
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].field).toBe('columns[0].header');
  });

  it('skips blocks with null data', () => {
    const ctx: ValidationRuleContext = {
      blocks: [{ index: 0, rawYaml: '', data: null, startOffset: 0, endOffset: 0, yamlStartOffset: 0, yamlEndOffset: 0 }],
      idMap: new Map(),
      issues: [],
      options: {},
    };
    placeholderContentRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
