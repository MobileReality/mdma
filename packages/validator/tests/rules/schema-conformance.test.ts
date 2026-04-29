import { describe, it, expect } from 'vitest';
import { schemaConformanceRule } from '../../src/rules/schema-conformance.js';
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

describe('schema-conformance rule', () => {
  it('passes for a valid form component', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'my-form',
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags missing type field', () => {
    const ctx = createContext([createBlock(0, { id: 'no-type' })]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('"type"');
    expect(ctx.issues[0].field).toBe('type');
  });

  it('flags unknown component type with valid types list', () => {
    const ctx = createContext([createBlock(0, { type: 'foobar', id: 'x' })]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('Unknown component type');
    expect(ctx.issues[0].message).toContain('foobar');
    expect(ctx.issues[0].message).toContain('Valid types:');
    expect(ctx.issues[0].message).toContain('form');
    expect(ctx.issues[0].message).toContain('button');
  });

  it('suggests closest type for a typo via Levenshtein', () => {
    const ctx = createContext([createBlock(0, { type: 'frm', id: 'x' })]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('did you mean "form"');
  });

  it('suggests closest type for normalized match', () => {
    const ctx = createContext([createBlock(0, { type: 'approval_gate', id: 'x' })]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('did you mean "approval-gate"');
  });

  it('does not suggest when type is too far from any known type', () => {
    const ctx = createContext([createBlock(0, { type: 'zzzzzzz', id: 'x' })]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).not.toContain('did you mean');
    expect(ctx.issues[0].message).toContain('Valid types:');
  });

  it('includes custom schema types in valid types list', () => {
    const { z } = require('zod');
    const customSchema = z.object({
      type: z.literal('progress'),
      id: z.string(),
      value: z.number(),
    });
    const ctx: ValidationRuleContext = {
      blocks: [createBlock(0, { type: 'foobar', id: 'x' })],
      idMap: new Map([['x', 0]]),
      issues: [],
      options: { customSchemas: { progress: customSchema } },
    };
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('progress');
    expect(ctx.issues[0].message).toContain('form');
  });

  it('flags Zod validation errors', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'button',
        id: 'btn',
        // missing required `text` and `onAction`
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues.length).toBeGreaterThan(0);
    expect(ctx.issues[0].ruleId).toBe('schema-conformance');
    expect(ctx.issues[0].severity).toBe('error');
  });

  it('skips blocks with null data', () => {
    const ctx = createContext([createBlock(0, null)]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('validates custom component type via customSchemas', () => {
    const { z } = require('zod');
    const customSchema = z.object({
      type: z.literal('progress'),
      id: z.string().min(1),
      value: z.number().min(0).max(100),
      label: z.string().optional(),
    });
    const ctx: ValidationRuleContext = {
      blocks: [createBlock(0, { type: 'progress', id: 'p', value: 50 })],
      idMap: new Map([['p', 0]]),
      issues: [],
      options: { customSchemas: { progress: customSchema } },
    };
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags invalid custom component', () => {
    const { z } = require('zod');
    const customSchema = z.object({
      type: z.literal('progress'),
      id: z.string().min(1),
      value: z.number().min(0).max(100),
    });
    const ctx: ValidationRuleContext = {
      blocks: [createBlock(0, { type: 'progress', id: 'p', value: 200 })],
      idMap: new Map([['p', 0]]),
      issues: [],
      options: { customSchemas: { progress: customSchema } },
    };
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues.length).toBeGreaterThan(0);
  });

  it('does not use custom schema for built-in types', () => {
    const { z } = require('zod');
    const fakeSchema = z.object({ type: z.literal('callout') });
    const ctx: ValidationRuleContext = {
      blocks: [createBlock(0, { type: 'callout', id: 'c', content: 'Hello' })],
      idMap: new Map([['c', 0]]),
      issues: [],
      options: { customSchemas: { callout: fakeSchema } },
    };
    schemaConformanceRule.validate(ctx);
    // Should use built-in schema (which passes), not the fake one
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes for a valid callout', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'callout',
        id: 'notice',
        content: 'Hello world',
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes for a form with a file field', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'form',
        id: 'upload-form',
        fields: [{ name: 'resume', type: 'file', label: 'Resume', required: true }],
      }),
    ]);
    schemaConformanceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
