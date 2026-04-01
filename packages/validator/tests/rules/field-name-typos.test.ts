import { describe, it, expect } from 'vitest';
import { fieldNameTyposRule } from '../../src/rules/field-name-typos.js';
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

describe('field-name-typos rule', () => {
  it('flags approval-gate with "roles" instead of "allowedRoles"', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'approval-gate',
        id: 'ag',
        title: 'Approve',
        roles: ['admin', 'manager'],
      }),
    ]);
    fieldNameTyposRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('field-name-typos');
    expect(ctx.issues[0].message).toContain('allowedRoles');
  });

  it('passes for correct field names', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'approval-gate',
        id: 'ag',
        title: 'Approve',
        allowedRoles: ['admin'],
      }),
    ]);
    fieldNameTyposRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags button with "onClick" instead of "onAction"', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'btn',
        text: 'Go',
        onClick: 'do-something',
      }),
    ]);
    fieldNameTyposRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('onAction');
  });

  it('skips component types without typo map', () => {
    const ctx = createContext([createBlock(0, { type: 'callout', id: 'c', content: 'hi' })]);
    fieldNameTyposRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips blocks with null data', () => {
    const ctx: ValidationRuleContext = {
      blocks: [
        {
          index: 0,
          rawYaml: '',
          data: null,
          startOffset: 0,
          endOffset: 0,
          yamlStartOffset: 0,
          yamlEndOffset: 0,
        },
      ],
      idMap: new Map(),
      issues: [],
      options: {},
    };
    fieldNameTyposRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
