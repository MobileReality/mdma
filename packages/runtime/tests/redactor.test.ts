import { describe, it, expect } from 'vitest';
import { redactPayload } from '../src/redaction/redactor.js';
import { hashValue } from '../src/redaction/hash.js';

describe('redactPayload', () => {
  it('does not redact non-sensitive data', () => {
    const ctx = { sensitiveComponents: new Set<string>(), sensitiveFields: new Set<string>() };
    const result = redactPayload({ name: 'Alice' }, 'comp1', ctx);
    expect(result.redacted).toBe(false);
    expect(result.payload.name).toBe('Alice');
  });

  it('redacts all fields for sensitive components', () => {
    const ctx = {
      sensitiveComponents: new Set(['comp1']),
      sensitiveFields: new Set<string>(),
    };
    const result = redactPayload({ name: 'Alice', email: 'a@b.com' }, 'comp1', ctx);
    expect(result.redacted).toBe(true);
    expect(result.payload.name).toBe(hashValue('Alice'));
    expect(result.payload.email).toBe(hashValue('a@b.com'));
  });

  it('redacts only sensitive fields', () => {
    const ctx = {
      sensitiveComponents: new Set<string>(),
      sensitiveFields: new Set(['email']),
    };
    const result = redactPayload({ name: 'Alice', email: 'a@b.com' }, 'comp1', ctx);
    expect(result.redacted).toBe(true);
    expect(result.payload.name).toBe('Alice');
    expect(result.payload.email).toBe(hashValue('a@b.com'));
  });
});

describe('hashValue', () => {
  it('produces consistent hashes', () => {
    expect(hashValue('test')).toBe(hashValue('test'));
  });

  it('produces different hashes for different values', () => {
    expect(hashValue('a')).not.toBe(hashValue('b'));
  });

  it('starts with redacted: prefix', () => {
    expect(hashValue('anything')).toMatch(/^redacted:[0-9a-f]{8}$/);
  });
});
