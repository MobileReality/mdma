import { describe, it, expect } from 'vitest';
import {
  resolveBindingPath,
  parseBindingExpression,
  resolveValue,
} from '../src/core/binding-resolver.js';

describe('resolveBindingPath', () => {
  it('resolves simple keys', () => {
    expect(resolveBindingPath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('resolves nested paths', () => {
    const state = { user: { profile: { name: 'Bob' } } };
    expect(resolveBindingPath(state, 'user.profile.name')).toBe('Bob');
  });

  it('returns undefined for missing paths', () => {
    expect(resolveBindingPath({ a: 1 }, 'b')).toBeUndefined();
    expect(resolveBindingPath({ a: 1 }, 'a.b.c')).toBeUndefined();
  });

  it('handles null/undefined in path', () => {
    expect(resolveBindingPath({ a: null }, 'a.b')).toBeUndefined();
  });
});

describe('parseBindingExpression', () => {
  it('extracts path from valid bindings', () => {
    expect(parseBindingExpression('{{name}}')).toBe('name');
    expect(parseBindingExpression('{{user.name}}')).toBe('user.name');
  });

  it('returns null for non-bindings', () => {
    expect(parseBindingExpression('plain text')).toBeNull();
    expect(parseBindingExpression('{name}')).toBeNull();
  });
});

describe('resolveValue', () => {
  it('resolves binding expressions', () => {
    expect(resolveValue('{{name}}', { name: 'Alice' })).toBe('Alice');
  });

  it('returns literals as-is', () => {
    expect(resolveValue('hello', {})).toBe('hello');
    expect(resolveValue(42, {})).toBe(42);
    expect(resolveValue(true, {})).toBe(true);
  });
});
