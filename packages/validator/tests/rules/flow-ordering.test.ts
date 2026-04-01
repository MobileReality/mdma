import { describe, it, expect } from 'vitest';
import { flowOrderingRule } from '../../src/rules/flow-ordering.js';
import type { ValidationRuleContext, ParsedBlock } from '../../src/types.js';

function createBlock(index: number, data: Record<string, unknown>): ParsedBlock {
  return { index, rawYaml: '', data, startOffset: 0, endOffset: 0, yamlStartOffset: 0, yamlEndOffset: 0 };
}

function createContext(blocks: ParsedBlock[]): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') idMap.set(block.data.id, block.index);
  }
  return { blocks, idMap, issues: [], options: {} };
}

describe('flow-ordering rule', () => {
  it('passes when interactive component targets a non-interactive component', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [], onSubmit: 'c' }),
      createBlock(1, { type: 'callout', id: 'c', content: 'Done!' }),
    ]);
    flowOrderingRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags backward references', () => {
    const ctx = createContext([
      createBlock(0, { type: 'webhook', id: 'wh', url: 'https://api.example.com', trigger: 'btn' }),
      createBlock(1, { type: 'button', id: 'btn', text: 'Go', onAction: 'wh' }),
    ]);
    flowOrderingRule.validate(ctx);
    const backwardIssues = ctx.issues.filter((i) => i.message.includes('backward'));
    expect(backwardIssues.length).toBeGreaterThan(0);
  });

  it('detects circular references', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'a', fields: [], onSubmit: 'b' }),
      createBlock(1, { type: 'form', id: 'b', fields: [], onSubmit: 'a' }),
    ]);
    flowOrderingRule.validate(ctx);
    const cycleIssues = ctx.issues.filter((i) => i.message.includes('Circular'));
    expect(cycleIssues).toHaveLength(1);
  });

  it('ignores unknown target IDs', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [], onSubmit: 'nonexistent' }),
    ]);
    flowOrderingRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags multi-step flow: interactive → interactive in same document', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'step-1', fields: [], onSubmit: 'step-2' }),
      createBlock(1, { type: 'approval-gate', id: 'step-2', title: 'Approve', onApprove: 'step-3' }),
      createBlock(2, { type: 'button', id: 'step-3', text: 'Done' }),
    ]);
    flowOrderingRule.validate(ctx);
    const chainIssues = ctx.issues.filter((i) => i.message.includes('Multi-step'));
    // form → approval-gate, approval-gate → button
    expect(chainIssues).toHaveLength(2);
    expect(chainIssues[0].severity).toBe('error');
  });

  it('does not flag interactive → non-interactive (callout, webhook)', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [], onSubmit: 'wh' }),
      createBlock(1, { type: 'webhook', id: 'wh', url: 'https://api.example.com', trigger: 'f' }),
    ]);
    flowOrderingRule.validate(ctx);
    const chainIssues = ctx.issues.filter((i) => i.message.includes('Multi-step'));
    expect(chainIssues).toHaveLength(0);
  });

  it('flags multiple interactive types without action chains (form + approval-gate)', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }),
      createBlock(1, { type: 'approval-gate', id: 'ag', title: 'Approve' }),
      createBlock(2, { type: 'callout', id: 'c', content: 'Done' }),
    ]);
    flowOrderingRule.validate(ctx);
    const typeIssues = ctx.issues.filter((i) => i.message.includes('Multiple interactive'));
    expect(typeIssues).toHaveLength(1);
    expect(typeIssues[0].severity).toBe('error');
  });

  it('allows form + button in the same message', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }),
      createBlock(1, { type: 'button', id: 'btn', text: 'Submit' }),
    ]);
    flowOrderingRule.validate(ctx);
    const typeIssues = ctx.issues.filter((i) => i.message.includes('Multiple interactive'));
    expect(typeIssues).toHaveLength(0);
  });

  it('flags form + tasklist as different workflow stages', () => {
    const ctx = createContext([
      createBlock(0, { type: 'form', id: 'f', fields: [] }),
      createBlock(1, { type: 'tasklist', id: 'tl', items: [{ id: 't1', text: 'Do it' }] }),
    ]);
    flowOrderingRule.validate(ctx);
    const typeIssues = ctx.issues.filter((i) => i.message.includes('Multiple interactive'));
    expect(typeIssues).toHaveLength(1);
  });
});
