import { describe, it, expect } from 'vitest';
import { parseYaml } from '../src/index.js';

describe('parseYaml', () => {
  it('parses simple YAML mapping', () => {
    const result = parseYaml('type: callout\nid: notice\ncontent: Hello');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toEqual({ type: 'callout', id: 'notice', content: 'Hello' });
    }
  });

  it('auto-quotes values containing colon-space', () => {
    const result = parseYaml('type: callout\nid: notice\ncontent: Step 1: Enter your info');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content).toBe('Step 1: Enter your info');
    }
  });

  it('auto-quotes multiple colon-space values', () => {
    const result = parseYaml(
      'type: form\nid: my-form\nlabel: Form: User Details\ntitle: Step 2: Review',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.label).toBe('Form: User Details');
      expect(result.data.title).toBe('Step 2: Review');
    }
  });

  it('does not double-quote already quoted values', () => {
    const result = parseYaml('type: callout\nid: notice\ncontent: "Already: quoted"');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content).toBe('Already: quoted');
    }
  });

  it('does not touch values inside block scalars', () => {
    const result = parseYaml('type: callout\nid: notice\ncontent: |\n  Line 1: has colon\n  Line 2: also colon');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.content).toContain('Line 1: has colon');
      expect(result.data.content).toContain('Line 2: also colon');
    }
  });

  it('returns error for non-object YAML', () => {
    const result = parseYaml('- a\n- b');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('YAML mapping');
    }
  });
});
