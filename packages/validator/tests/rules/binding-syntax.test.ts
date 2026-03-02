import { describe, it, expect } from 'vitest';
import { bindingSyntaxRule } from '../../src/rules/binding-syntax.js';
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

describe('binding-syntax rule', () => {
  it('passes for valid bindings', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'c',
        content: 'hi',
        visible: '{{form.enabled}}',
      }),
    ]);
    bindingSyntaxRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags empty binding expressions', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'c',
        content: 'hi',
        visible: '{{ }}',
      }),
    ]);
    bindingSyntaxRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].severity).toBe('error');
    expect(ctx.issues[0].message).toContain('Empty binding');
  });

  it('flags whitespace in bindings', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'c',
        content: 'hi',
        visible: '{{ form.enabled }}',
      }),
    ]);
    bindingSyntaxRule.validate(ctx);
    const wsIssues = ctx.issues.filter((i) =>
      i.message.includes('whitespace'),
    );
    expect(wsIssues.length).toBeGreaterThan(0);
    expect(wsIssues[0].severity).toBe('warning');
  });

  it('flags single-brace bindings', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'c',
        content: 'hi',
        visible: '{form.enabled}',
      }),
    ]);
    bindingSyntaxRule.validate(ctx);
    const singleIssues = ctx.issues.filter((i) =>
      i.message.includes('single-brace'),
    );
    expect(singleIssues.length).toBeGreaterThan(0);
    expect(singleIssues[0].severity).toBe('warning');
  });

  it('scans nested objects and arrays', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'webhook',
        id: 'w',
        url: 'https://api.example.com',
        trigger: 'submit',
        body: {
          email: '{{ form.email }}',
          tags: ['{form.tags}'],
        },
      }),
    ]);
    bindingSyntaxRule.validate(ctx);
    expect(ctx.issues.length).toBeGreaterThanOrEqual(2);
  });

  it('skips blocks with null data', () => {
    const ctx = createContext([
      { index: 0, rawYaml: '', data: null, startOffset: 0, endOffset: 0, yamlStartOffset: 0, yamlEndOffset: 0 } as ParsedBlock,
    ]);
    bindingSyntaxRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
