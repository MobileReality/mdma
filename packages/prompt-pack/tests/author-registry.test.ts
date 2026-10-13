import { describe, it, expect } from 'vitest';
import { AUTHOR_PROMPT_VARIANTS } from '../src/prompts/mdma-author/registry.js';

describe('AUTHOR_PROMPT_VARIANTS', () => {
  it('has unique ids', () => {
    const ids = AUTHOR_PROMPT_VARIANTS.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has a non-empty prompt string for every variant', () => {
    for (const variant of AUTHOR_PROMPT_VARIANTS) {
      expect(variant.prompt, variant.id).toBeTypeOf('string');
      expect(variant.prompt.trim().length, variant.id).toBeGreaterThan(0);
    }
  });

  it('describes thinking as a plan summary for anthropic/sonnet-5.5', () => {
    const variant = AUTHOR_PROMPT_VARIANTS.find((v) => v.id === 'anthropic/sonnet-5.5');
    expect(variant).toBeDefined();
    expect(variant?.prompt).not.toContain('AI reasoning');
    expect(variant?.prompt).toContain('plan summary');
  });
});
