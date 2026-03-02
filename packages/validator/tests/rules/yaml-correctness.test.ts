import { describe, it, expect } from 'vitest';
import { yamlCorrectnessRule } from '../../src/rules/yaml-correctness.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(
  index: number,
  data: Record<string, unknown> | null,
  extra: Partial<ParsedBlock> = {},
): ParsedBlock {
  return {
    index,
    rawYaml: '',
    data,
    startOffset: 0,
    endOffset: 0,
    yamlStartOffset: 0,
    yamlEndOffset: 0,
    ...extra,
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

describe('yaml-correctness rule', () => {
  it('passes for valid blocks', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }),
    ]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags blocks with null data (invalid YAML)', () => {
    const ctx = createContext([
      createBlock(0, null, { parseError: 'Unexpected token at line 2' }),
    ]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('yaml-correctness');
    expect(ctx.issues[0].severity).toBe('error');
    expect(ctx.issues[0].message).toContain('Unexpected token');
  });

  it('uses default message when parseError is missing', () => {
    const ctx = createContext([createBlock(0, null)]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toBe('Invalid YAML in mdma block');
  });

  it('warns when a block was split from a multi-component block', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }, { splitFrom: 0 }),
    ]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('split');
    expect(ctx.issues[0].fixed).toBe(true);
  });

  it('warns when YAML document separators were stripped', () => {
    const ctx = createContext([
      createBlock(
        0,
        { type: 'callout', id: 'c', content: 'hi' },
        { yamlSanitized: true },
      ),
    ]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('---');
    expect(ctx.issues[0].fixed).toBe(true);
  });

  it('reports componentId from data when available', () => {
    const ctx = createContext([
      createBlock(
        0,
        { type: 'form', id: 'my-form', fields: [] },
        { yamlSanitized: true },
      ),
    ]);
    yamlCorrectnessRule.validate(ctx);
    expect(ctx.issues[0].componentId).toBe('my-form');
  });
});
