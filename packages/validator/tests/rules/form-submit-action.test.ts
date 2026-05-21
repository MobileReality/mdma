import { describe, it, expect } from 'vitest';
import { formSubmitActionRule } from '../../src/rules/form-submit-action.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown> | null): ParsedBlock {
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

describe('form-submit-action rule', () => {
  it('flags a form missing onSubmit', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      }),
    ]);
    formSubmitActionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('form-submit-action');
    expect(ctx.issues[0].severity).toBe('error');
    expect(ctx.issues[0].message).toBe('Form must have an onSubmit action');
    expect(ctx.issues[0].componentId).toBe('my-form');
    expect(ctx.issues[0].field).toBe('onSubmit');
  });

  it('flags a form with an empty onSubmit', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
        onSubmit: '',
      }),
    ]);
    formSubmitActionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('form-submit-action');
  });

  it('passes when form has a valid onSubmit', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
        onSubmit: 'submit-webhook',
      }),
    ]);
    formSubmitActionRule.validate(ctx);
    const formIssues = ctx.issues.filter((i) => i.ruleId === 'form-submit-action');
    expect(formIssues).toHaveLength(0);
  });

  it('does not flag non-form components', () => {
    const ctx = createContext([
      createBlock(0, { type: 'button', id: 'btn', text: 'Submit', onAction: 'some-form' }),
      createBlock(1, { type: 'callout', id: 'info', content: 'Hello' }),
    ]);
    formSubmitActionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips blocks with null data', () => {
    const ctx = createContext([createBlock(0, null)]);
    formSubmitActionRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('produces exactly one issue per form missing onSubmit', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'form-a',
        fields: [{ name: 'name', type: 'text', label: 'Name' }],
      }),
      createBlock(1, {
        type: 'form',
        id: 'form-b',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
        onSubmit: 'some-action',
      }),
      createBlock(2, {
        type: 'form',
        id: 'form-c',
        fields: [{ name: 'phone', type: 'text', label: 'Phone' }],
      }),
    ]);
    formSubmitActionRule.validate(ctx);
    const issues = ctx.issues.filter((i) => i.ruleId === 'form-submit-action');
    expect(issues).toHaveLength(2);
    expect(issues[0].componentId).toBe('form-a');
    expect(issues[1].componentId).toBe('form-c');
  });
});
