import { describe, it, expect } from 'vitest';
import { requiredMarkersRule } from '../../src/rules/required-markers.js';
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

describe('required-markers rule', () => {
  it('passes when heuristic fields are already required', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          { name: 'name', type: 'text', label: 'Name', required: true },
          { name: 'email', type: 'email', label: 'Email', required: true },
        ],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('suggests required for fields named "name"', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'name', type: 'text', label: 'Name' }],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].ruleId).toBe('required-markers');
    expect(ctx.issues[0].severity).toBe('info');
    expect(ctx.issues[0].message).toContain('name');
  });

  it('suggests required for email type fields', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [{ name: 'contact', type: 'email', label: 'Contact Email' }],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('contact');
  });

  it('suggests required for "title" and "summary" field names', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          { name: 'title', type: 'text', label: 'Title' },
          { name: 'summary', type: 'textarea', label: 'Summary' },
          { name: 'notes', type: 'textarea', label: 'Notes' },
        ],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(2); // title and summary, not notes
  });

  it('ignores non-form components', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table',
        id: 't',
        columns: [{ key: 'name', header: 'Name' }],
        data: [],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('skips fields without a matching heuristic name', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'f',
        fields: [
          { name: 'description', type: 'textarea', label: 'Description' },
          { name: 'priority', type: 'select', label: 'Priority' },
        ],
      }),
    ]);
    requiredMarkersRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
