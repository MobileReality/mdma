import { describe, it, expect } from 'vitest';
import { selectOptionsRule } from '../../src/rules/select-options.js';
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
    if (block.data && typeof block.data.id === 'string') idMap.set(block.data.id, block.index);
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('select-options rule', () => {
  it('passes for select with valid options array', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          {
            name: 'color',
            type: 'select',
            label: 'Color',
            options: [{ label: 'Red', value: 'red' }],
          },
        ],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes for select with binding string options', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'country', type: 'select', label: 'Country', options: '{{countries}}' }],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('warns for select with missing options', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'color', type: 'select', label: 'Color' }],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('select-options');
    expect(ctx.issues[0].message).toContain('missing options');
  });

  it('warns for malformed option objects', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'color', type: 'select', label: 'Color', options: [{ label: 'Red' }] }],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('malformed option');
  });

  it('skips non-select fields', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes for a searchable select backed by a data source', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          {
            name: 'product',
            type: 'select',
            label: 'Product',
            searchable: true,
            options: { source: 'products' },
          },
        ],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('warns when searchable is set on a non-select field', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'notes', type: 'text', label: 'Notes', searchable: true }],
      }),
    ]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].field).toBe('fields[0]');
    expect(ctx.issues[0].message).toContain('only applies to select');
  });

  it('skips non-form components', () => {
    const ctx = createContext([createBlock(0, { type: 'callout', id: 'c', content: 'hi' })]);
    selectOptionsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
