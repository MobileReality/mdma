import { describe, it, expect } from 'vitest';
import { schemaConformanceRule } from '../../src/rules/schema-conformance.js';
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
      idMap.set(block.data.id, block.index);
    }
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('schema-conformance rule', () => {
  it('passes for a valid form component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [
          { name: 'email', type: 'email', label: 'Email' },
        ],
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags missing type field', () => {
    const ctx = createContext([
      createBlock(0, { id: 'no-type' }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('"type"');
    expect(ctx.issues[0].field).toBe('type');
  });

  it('flags unknown component type', () => {
    const ctx = createContext([
      createBlock(0, { type: 'foobar', id: 'x' }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('Unknown component type');
    expect(ctx.issues[0].message).toContain('foobar');
  });

  it('flags Zod validation errors', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'btn',
        // missing required `text` and `onAction`
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues.length).toBeGreaterThan(0);
    expect(ctx.issues[0].ruleId).toBe('schema-conformance');
    expect(ctx.issues[0].severity).toBe('error');
  });

  it('skips blocks with null data', () => {
    const ctx = createContext([createBlock(0, null)]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes for a valid callout', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'notice',
        content: 'Hello world',
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
