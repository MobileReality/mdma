import { describe, it, expect } from 'vitest';
import { loadPrompt, listPrompts } from '../src/loader.js';

describe('loadPrompt', () => {
  it('returns the mdma-author prompt content', () => {
    const content = loadPrompt('mdma-author');
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('MDMA');
  });

  it('returns the mdma-reviewer prompt content', () => {
    const content = loadPrompt('mdma-reviewer');
    expect(content).toBeTypeOf('string');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('review');
  });

  it('throws on an unknown prompt name', () => {
    expect(() => loadPrompt('nonexistent')).toThrowError(
      /Unknown prompt "nonexistent"/,
    );
  });

  it('includes available prompt names in the error message', () => {
    expect(() => loadPrompt('bad-name')).toThrowError(/mdma-author/);
    expect(() => loadPrompt('bad-name')).toThrowError(/mdma-reviewer/);
  });
});

describe('listPrompts', () => {
  it('returns an array of all available prompt names', () => {
    const names = listPrompts();
    expect(names).toBeInstanceOf(Array);
    expect(names).toContain('mdma-author');
    expect(names).toContain('mdma-reviewer');
  });

  it('returns exactly 2 prompts', () => {
    const names = listPrompts();
    expect(names).toHaveLength(2);
  });
});
