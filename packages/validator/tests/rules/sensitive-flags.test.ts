import { describe, it, expect } from 'vitest';
import { sensitiveFlagsRule } from '../../src/rules/sensitive-flags.js';
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

function createContext(blocks: ParsedBlock[], options = {}): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') {
      idMap.set(block.data.id, block.index);
    }
  }
  return { blocks, idMap, issues: [], options };
}

describe('sensitive-flags rule', () => {
  it('passes when PII fields are marked sensitive', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'email', type: 'email', label: 'Email', sensitive: true }],
      }),
    ]);
    sensitiveFlagsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags form fields with PII names missing sensitive', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          { name: 'email', type: 'email', label: 'Email' },
          { name: 'phone', type: 'text', label: 'Phone Number' },
          { name: 'notes', type: 'textarea', label: 'Notes' },
        ],
      }),
    ]);
    sensitiveFlagsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2); // email and phone
    expect(ctx.issues[0].field).toBe('fields[0]');
    expect(ctx.issues[1].field).toBe('fields[1]');
  });

  it('flags table columns with PII names missing sensitive', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table',
        id: 't',
        columns: [
          { key: 'name', header: 'Name' },
          { key: 'address', header: 'Home Address' },
        ],
        data: [],
      }),
    ]);
    sensitiveFlagsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('address');
  });

  it('uses custom PII patterns', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [{ name: 'badge_id', type: 'text', label: 'Badge ID' }],
        }),
      ],
      { customPiiPatterns: [/badge/i] },
    );
    sensitiveFlagsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
  });
});
