import { describe, it, expect } from 'vitest';
import { bindingResolutionRule } from '../../src/rules/binding-resolution.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(
  index: number,
  data: Record<string, unknown>,
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

describe('binding-resolution rule', () => {
  it('passes when bindings reference existing component IDs', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'contact-form',
        fields: [
          { name: 'email', type: 'email', label: 'Email' },
        ],
      }),
      createBlock(1, {
        type: 'callout',
        id: 'info',
        content: 'hi',
        visible: '{{contact-form.email}}',
      }),
    ]);
    bindingResolutionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags bindings referencing non-existent component IDs', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'info',
        content: 'hi',
        visible: '{{missing_form.email}}',
      }),
    ]);
    bindingResolutionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('binding-resolution');
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('missing_form');
  });

  it('suggests near-matches for misspelled IDs', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'contact-form',
        fields: [],
      }),
      createBlock(1, {
        type: 'callout',
        id: 'info',
        content: 'hi',
        visible: '{{contact_form.email}}',
      }),
    ]);
    bindingResolutionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('did you mean');
    expect(ctx.issues[0].message).toContain('contact-form');
  });

  it('skips blocks with null data', () => {
    const blocks: ParsedBlock[] = [
      { index: 0, rawYaml: '', data: null, startOffset: 0, endOffset: 0, yamlStartOffset: 0, yamlEndOffset: 0 },
    ];
    const ctx: ValidationRuleContext = {
      blocks,
      idMap: new Map(),
      issues: [],
      options: {},
    };
    bindingResolutionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
