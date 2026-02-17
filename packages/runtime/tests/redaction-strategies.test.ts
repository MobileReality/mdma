import { describe, it, expect } from 'vitest';
import { hashStrategy } from '../src/redaction/strategies/hash-strategy.js';
import { maskStrategy } from '../src/redaction/strategies/mask-strategy.js';
import { omitStrategy } from '../src/redaction/strategies/omit-strategy.js';

describe('Redaction Strategies', () => {
  describe('hashStrategy', () => {
    it('has name "hash"', () => {
      expect(hashStrategy.name).toBe('hash');
    });

    it('hashes a string value', () => {
      const result = hashStrategy.redact('secret@example.com');
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^redacted:/);
    });

    it('produces same hash for same input', () => {
      const a = hashStrategy.redact('test');
      const b = hashStrategy.redact('test');
      expect(a).toBe(b);
    });

    it('produces different hashes for different input', () => {
      const a = hashStrategy.redact('test1');
      const b = hashStrategy.redact('test2');
      expect(a).not.toBe(b);
    });

    it('handles non-string values', () => {
      const result = hashStrategy.redact(12345);
      expect(typeof result).toBe('string');
      expect(result).toMatch(/^redacted:/);
    });
  });

  describe('maskStrategy', () => {
    it('has name "mask"', () => {
      expect(maskStrategy.name).toBe('mask');
    });

    it('masks a long string showing first chars', () => {
      const result = maskStrategy.redact('secret@example.com');
      expect(typeof result).toBe('string');
      expect(String(result)).toContain('***');
      expect(String(result)).toMatch(/^sec\*\*\*$/);
    });

    it('masks a short string completely', () => {
      const result = maskStrategy.redact('ab');
      expect(result).toBe('***');
    });

    it('masks a 3-char string completely', () => {
      const result = maskStrategy.redact('abc');
      expect(result).toBe('***');
    });

    it('handles non-string values', () => {
      const result = maskStrategy.redact(42);
      expect(typeof result).toBe('string');
      expect(String(result)).toContain('***');
    });
  });

  describe('omitStrategy', () => {
    it('has name "omit"', () => {
      expect(omitStrategy.name).toBe('omit');
    });

    it('replaces value with [REDACTED]', () => {
      expect(omitStrategy.redact('secret')).toBe('[REDACTED]');
    });

    it('works for any input type', () => {
      expect(omitStrategy.redact(123)).toBe('[REDACTED]');
      expect(omitStrategy.redact(null)).toBe('[REDACTED]');
      expect(omitStrategy.redact({ a: 1 })).toBe('[REDACTED]');
    });
  });
});
