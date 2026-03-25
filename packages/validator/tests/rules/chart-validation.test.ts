import { describe, it, expect } from 'vitest';
import { chartValidationRule } from '../../src/rules/chart-validation.js';
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

describe('chart-validation rule', () => {
  it('passes for valid CSV with matching axes', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'chart', id: 'ch',
        data: 'Month,Revenue,Costs\nJan,100,80\nFeb,120,90',
        xAxis: 'Month',
        yAxis: ['Revenue', 'Costs'],
      }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('warns when xAxis not in CSV headers', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'chart', id: 'ch',
        data: 'Month,Revenue\nJan,100',
        xAxis: 'Date',
      }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('xAxis');
    expect(ctx.issues[0].message).toContain('Date');
  });

  it('warns when yAxis item not in CSV headers', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'chart', id: 'ch',
        data: 'Month,Revenue\nJan,100',
        yAxis: 'Profit',
      }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('yAxis');
    expect(ctx.issues[0].message).toContain('Profit');
  });

  it('skips binding expression data', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'chart', id: 'ch',
        data: '{{sales-data.csv}}',
        xAxis: 'anything',
      }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('warns on CSV with only header row (no data)', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'chart', id: 'ch',
        data: 'Month,Revenue',
      }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('valid CSV');
  });

  it('skips non-chart components', () => {
    const ctx = createContext([
      createBlock(0, { type: 'callout', id: 'c', content: 'hi' }),
    ]);
    chartValidationRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
