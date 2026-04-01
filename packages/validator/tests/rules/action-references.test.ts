import { describe, it, expect } from 'vitest';
import { actionReferencesRule } from '../../src/rules/action-references.js';
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

describe('action-references rule', () => {
  it('passes when webhook trigger references a valid component ID', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'submit-btn',
        text: 'Submit',
        onAction: 'submit-btn',
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
        onAction: 'submit-btn',
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

  it('flags form onSubmit referencing non-existent component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [],
        onSubmit: 'nonexistent-action',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('nonexistent-action');
  });

  it('passes when form onSubmit references valid component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [],
        onSubmit: 'wh',
      }),
      createBlock(1, {
        type: 'webhook',
        id: 'wh',
        url: 'https://api.example.com',
        trigger: 'f',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags button onAction referencing non-existent component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'btn',
        text: 'Submit',
        onAction: 'does-not-exist',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('does-not-exist');
  });

  it('flags tasklist onComplete referencing non-existent component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'tasklist',
        id: 'tl',
        items: [],
        onComplete: 'missing-target',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('missing-target');
  });

  it('flags approval-gate onApprove and onDeny referencing non-existent components', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'approval-gate',
        id: 'ag',
        title: 'Approve',
        onApprove: 'missing-approve',
        onDeny: 'missing-deny',
      }),
    ]);
    actionReferencesRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2);
    expect(ctx.issues[0].message).toContain('missing-approve');
    expect(ctx.issues[1].message).toContain('missing-deny');
  });

  it('skips blocks with null data', () => {
    const blocks: ParsedBlock[] = [
      {
        index: 0,
        rawYaml: '',
        data: null,
        startOffset: 0,
        endOffset: 0,
        yamlStartOffset: 0,
        yamlEndOffset: 0,
      },
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
