import { describe, it, expect } from 'vitest';
import { actionReferencesRule } from '../../src/rules/action-references.js';
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

describe('action-references rule', () => {
  it('passes when webhook trigger references a valid component ID', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'submit-btn',
        text: 'Submit',
        onAction: 'submit-action',
      }),
      createBlock(1, {
        type: 'webhook',
        id: 'wh',
        url: 'https://api.example.com',
        trigger: 'submit-btn',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags webhook trigger referencing non-existent component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'webhook',
        id: 'wh',
        url: 'https://api.example.com',
        trigger: 'nonexistent-btn',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('action-references');
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('nonexistent-btn');
  });

  it('suggests near-matches for misspelled trigger IDs', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'submit-btn',
        text: 'Go',
        onAction: 'do-it',
      }),
      createBlock(1, {
        type: 'webhook',
        id: 'wh',
        url: 'https://api.example.com',
        trigger: 'submit_btn',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('did you mean');
    expect(ctx.issues[0].message).toContain('submit-btn');
  });

  it('does not flag non-webhook components', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'btn',
        text: 'Submit',
        onAction: 'some-action-that-doesnt-exist-as-id',
      }),
      createBlock(1, {
        type: 'form',
        id: 'f',
        fields: [],
        onSubmit: 'another-nonexistent-action',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
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
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
