import { describe, it, expect } from 'vitest';
import { unreferencedComponentsRule } from '../../src/rules/unreferenced-components.js';
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

describe('unreferenced-components rule', () => {
  it('does not flag component referenced via binding', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      }),
      createBlock(1, { type: 'callout', id: 'info', content: 'hi', visible: '{{my-form.email}}' }),
    ]);
    unreferencedComponentsRule.validate(ctx);
    // my-form is referenced, info is at index 1 and referenced by nothing BUT my-form is referenced
    const issues = ctx.issues.filter((i) => i.componentId === 'my-form');
    expect(issues).toHaveLength(0);
  });

  it('does not flag component referenced via onAction', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'my-form', fields: [] }),
      createBlock(1, { type: 'button', id: 'btn', text: 'Go', onAction: 'my-form' }),
    ]);
    unreferencedComponentsRule.validate(ctx);
    const issues = ctx.issues.filter((i) => i.componentId === 'my-form');
    expect(issues).toHaveLength(0);
  });

  it('flags unreferenced non-first, non-thinking component', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'my-form', fields: [] }),
      createBlock(1, { type: 'callout', id: 'orphan', content: 'I am alone' }),
    ]);
    unreferencedComponentsRule.validate(ctx);
    const issues = ctx.issues.filter((i) => i.componentId === 'orphan');
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
  });

  it('does not flag the first component', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'first', content: 'I am first' }),
      createBlock(1, {
        type: 'callout',
        id: 'second',
        content: 'hi',
        visible: '{{first.something}}',
      }),
    ]);
    unreferencedComponentsRule.validate(ctx);
    const issues = ctx.issues.filter((i) => i.componentId === 'first');
    expect(issues).toHaveLength(0);
  });

  it('does not flag thinking blocks', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }),
      createBlock(1, {
        type: 'thinking',
        id: 'think',
        content: 'Reasoning...',
        status: 'done',
        collapsed: true,
      }),
    ]);
    unreferencedComponentsRule.validate(ctx);
    const issues = ctx.issues.filter((i) => i.componentId === 'think');
    expect(issues).toHaveLength(0);
  });

  it('skips when only one component exists', () => {
    const ctx = createContext([createBlock(0, { type: 'callout', id: 'only', content: 'Solo' })]);
    unreferencedComponentsRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
