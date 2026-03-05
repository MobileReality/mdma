import { describe, it, expect } from 'vitest';
import { detectPii, auditSensitiveFields } from '../src/redaction/pii-detector.js';

describe('detectPii', () => {
  it('detects email by field name', () => {
    const result = detectPii('email', '');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('email');
  });

  it('detects email by value pattern', () => {
    const result = detectPii('contact', 'user@example.com');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('email');
  });

  it('detects email by both name and value', () => {
    const result = detectPii('email', 'user@example.com');
    expect(result).not.toBeNull();
    expect(result?.confidence).toBe(1);
  });

  it('detects phone by field name', () => {
    const result = detectPii('phone_number', '');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('phone');
  });

  it('detects phone by value pattern', () => {
    const result = detectPii('contact', '+1 555-1234');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('phone');
  });

  it('detects SSN by field name', () => {
    const result = detectPii('ssn', '');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('ssn');
  });

  it('detects SSN by value pattern', () => {
    const result = detectPii('identifier', '123-45-6789');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('ssn');
  });

  it('detects credit card by field name', () => {
    const result = detectPii('credit_card', '');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('credit_card');
  });

  it('detects credit card by value pattern', () => {
    const result = detectPii('payment', '4111 1111 1111 1111');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('credit_card');
  });

  it('detects name-like fields', () => {
    const result = detectPii('patient_name', '');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('name_like');
  });

  it('detects name-like values', () => {
    const result = detectPii('owner', 'John Smith');
    expect(result).not.toBeNull();
    expect(result?.detectedTypes).toContain('name_like');
  });

  it('returns null for non-PII fields', () => {
    const result = detectPii('quantity', '42');
    expect(result).toBeNull();
  });

  it('returns null for non-PII field names', () => {
    const result = detectPii('description', 'some text');
    expect(result).toBeNull();
  });

  it('includes a suggestion message', () => {
    const result = detectPii('email', 'test@test.com');
    expect(result).not.toBeNull();
    expect(result?.suggestion).toContain('sensitive: true');
  });
});

describe('auditSensitiveFields', () => {
  it('flags PII fields not marked sensitive', () => {
    const results = auditSensitiveFields([
      { name: 'email', sensitive: false },
      { name: 'phone', sensitive: false },
      { name: 'description', sensitive: false },
    ]);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.field)).toContain('email');
    expect(results.map((r) => r.field)).toContain('phone');
  });

  it('skips fields already marked sensitive', () => {
    const results = auditSensitiveFields([
      { name: 'email', sensitive: true },
      { name: 'phone', sensitive: true },
    ]);
    expect(results).toHaveLength(0);
  });

  it('returns empty array when no PII detected', () => {
    const results = auditSensitiveFields([
      { name: 'quantity' },
      { name: 'status' },
    ]);
    expect(results).toHaveLength(0);
  });

  it('considers defaultValue for detection', () => {
    const results = auditSensitiveFields([
      { name: 'contact', defaultValue: 'user@example.com' },
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].detectedTypes).toContain('email');
  });
});
