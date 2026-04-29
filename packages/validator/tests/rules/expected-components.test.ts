import { describe, it, expect } from 'vitest';
import { expectedComponentsRule } from '../../src/rules/expected-components.js';
import type { ValidationRuleContext, ParsedBlock, ExpectedComponent } from '../../src/types.js';

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

function createContext(
  blocks: ParsedBlock[],
  expectedComponents: Record<string, ExpectedComponent>,
): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') {
      idMap.set(block.data.id, block.index);
    }
  }
  return { blocks, idMap, issues: [], options: { expectedComponents } };
}

describe('expected-components rule', () => {
  it('passes when all expected components are present with correct type and fields', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'contact-form',
          fields: [
            { name: 'email', type: 'email', label: 'Email' },
            { name: 'phone', type: 'text', label: 'Phone' },
          ],
        }),
        createBlock(1, { type: 'button', id: 'submit-btn', text: 'Submit', onAction: 'x' }),
      ],
      {
        'contact-form': { type: 'form', fields: ['email', 'phone'] },
        'submit-btn': { type: 'button' },
      },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips expected components not present in this message', () => {
    const ctx = createContext([createBlock(0, { type: 'callout', id: 'notice', content: 'Hi' })], {
      'my-form': { type: 'form' },
    });
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags wrong component type', () => {
    const ctx = createContext([createBlock(0, { type: 'callout', id: 'my-form', content: 'Hi' })], {
      'my-form': { type: 'form' },
    });
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('has type "callout"');
    expect(ctx.issues[0].message).toContain('expected "form"');
  });

  it('flags missing form fields', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'contact-form',
          fields: [{ name: 'email', type: 'email', label: 'Email' }],
        }),
      ],
      { 'contact-form': { type: 'form', fields: ['email', 'phone', 'name'] } },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2);
    expect(ctx.issues[0].message).toContain('missing expected field "phone"');
    expect(ctx.issues[0].message).toContain('available: email');
    expect(ctx.issues[1].message).toContain('missing expected field "name"');
  });

  it('flags missing table columns', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'table',
          id: 'users-table',
          columns: [{ key: 'name', header: 'Name' }],
          data: [],
        }),
      ],
      { 'users-table': { type: 'table', columns: ['name', 'email', 'status'] } },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2);
    expect(ctx.issues[0].message).toContain('missing expected column "email"');
    expect(ctx.issues[0].message).toContain('available: name');
    expect(ctx.issues[1].message).toContain('missing expected column "status"');
  });

  it('does not run when expectedComponents is not set', () => {
    const blocks = [createBlock(0, { type: 'form', id: 'f', fields: [] })];
    const idMap = new Map([['f', 0]]);
    const ctx: ValidationRuleContext = { blocks, idMap, issues: [], options: {} };
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips all expected components when message has no mdma blocks', () => {
    const ctx = createContext([], {
      'form-a': { type: 'form' },
      'table-b': { type: 'table' },
    });
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags missing action reference', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'my-form',
          fields: [{ name: 'email', type: 'email', label: 'Email' }],
        }),
      ],
      { 'my-form': { type: 'form', actions: { onSubmit: 'submit-btn' } } },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('missing expected action "onSubmit"');
    expect(ctx.issues[0].message).toContain('submit-btn');
  });

  it('flags wrong action target', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'my-form',
          fields: [{ name: 'email', type: 'email', label: 'Email' }],
          onSubmit: 'wrong-target',
        }),
      ],
      { 'my-form': { type: 'form', actions: { onSubmit: 'submit-btn' } } },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('warning');
    expect(ctx.issues[0].message).toContain('"wrong-target"');
    expect(ctx.issues[0].message).toContain('"submit-btn"');
  });

  it('passes when action reference matches', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'my-form',
          fields: [{ name: 'email', type: 'email', label: 'Email' }],
          onSubmit: 'submit-btn',
        }),
      ],
      { 'my-form': { type: 'form', actions: { onSubmit: 'submit-btn' } } },
    );
    expectedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('only checks components present in message, ignores the rest', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'form-a',
          fields: [{ name: 'email', type: 'email', label: 'Email' }],
        }),
      ],
      {
        'form-a': { type: 'form', fields: ['email', 'phone'] },
        'form-b': { type: 'form', fields: ['name'] },
      },
    );
    expectedComponentsRule.validate(ctx);
    // form-a is present → checked → missing "phone"
    // form-b is absent → skipped
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('missing expected field "phone"');
  });
});
