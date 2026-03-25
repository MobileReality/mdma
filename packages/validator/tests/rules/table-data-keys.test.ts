import { describe, it, expect } from 'vitest';
import { tableDataKeysRule } from '../../src/rules/table-data-keys.js';
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

describe('table-data-keys rule', () => {
  it('passes when data keys match columns', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }],
        data: [{ name: 'Alice', email: 'alice@example.com' }],
      }),
    ]);
    tableDataKeysRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags extra keys in data rows', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'Name' }],
        data: [{ name: 'Alice', phone: '555-1234' }],
      }),
    ]);
    tableDataKeysRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('phone'))).toBe(true);
  });

  it('flags columns with no matching data keys', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'Name' }, { key: 'email', header: 'Email' }],
        data: [{ name: 'Alice' }],
      }),
    ]);
    tableDataKeysRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('email'))).toBe(true);
  });

  it('skips binding expression data', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'Name' }],
        data: '{{some-component.rows}}',
      }),
    ]);
    tableDataKeysRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips non-table components', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: 'hi' }),
    ]);
    tableDataKeysRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('reports each extra key only once across rows', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table', id: 't',
        columns: [{ key: 'name', header: 'Name' }],
        data: [
          { name: 'Alice', phone: '555' },
          { name: 'Bob', phone: '666' },
        ],
      }),
    ]);
    tableDataKeysRule.validate(ctx);
    const phoneIssues = ctx.issues.filter((i) => i.message.includes('phone'));
    expect(phoneIssues).toHaveLength(1);
  });
});
