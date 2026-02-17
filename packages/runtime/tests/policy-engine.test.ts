import { describe, it, expect } from 'vitest';
import { PolicyEngine, PolicyViolationError, createDefaultPolicy } from '../src/policy/policy-engine.js';
import type { Policy } from '@mdma/spec';

describe('PolicyEngine', () => {
  const testPolicy: Policy = {
    version: 1,
    rules: [
      { action: 'send_email', environments: ['preview'], effect: 'deny', reason: 'No emails in preview' },
      { action: 'webhook_call', environments: ['production'], effect: 'allow' },
      { action: 'webhook_call', environments: ['preview'], effect: 'deny', reason: 'No webhooks in preview' },
    ],
    defaultEffect: 'allow',
  };

  it('denies actions matching a deny rule', () => {
    const engine = new PolicyEngine(testPolicy, 'preview');
    const result = engine.evaluate('send_email');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('No emails in preview');
  });

  it('allows actions matching an allow rule', () => {
    const engine = new PolicyEngine(testPolicy, 'production');
    const result = engine.evaluate('webhook_call');
    expect(result.allowed).toBe(true);
  });

  it('falls back to default effect for unmatched actions', () => {
    const engine = new PolicyEngine(testPolicy, 'production');
    const result = engine.evaluate('unknown_action');
    expect(result.allowed).toBe(true); // defaultEffect is allow
  });

  it('enforce throws on denied actions', () => {
    const engine = new PolicyEngine(testPolicy, 'preview');
    expect(() => engine.enforce('send_email')).toThrow(PolicyViolationError);
  });

  it('enforce does not throw on allowed actions', () => {
    const engine = new PolicyEngine(testPolicy, 'production');
    expect(() => engine.enforce('webhook_call')).not.toThrow();
  });

  it('default policy blocks email and webhooks in preview', () => {
    const engine = new PolicyEngine(createDefaultPolicy(), 'preview');
    expect(engine.evaluate('send_email').allowed).toBe(false);
    expect(engine.evaluate('webhook_call').allowed).toBe(false);
  });

  it('default policy allows actions in production', () => {
    const engine = new PolicyEngine(createDefaultPolicy(), 'production');
    expect(engine.evaluate('send_email').allowed).toBe(true);
    expect(engine.evaluate('webhook_call').allowed).toBe(true);
  });
});
