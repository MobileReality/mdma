import { describe, it, expect } from 'vitest';
import { ChainedEventLog } from '../src/core/event-log-integrity.js';

describe('ChainedEventLog', () => {
  function createLog() {
    return new ChainedEventLog('session-1', 'doc-1');
  }

  it('starts with size 0', () => {
    const log = createLog();
    expect(log.size).toBe(0);
  });

  it('appends entries with sequence numbers', () => {
    const log = createLog();
    const e1 = log.append({
      eventType: 'FIELD_CHANGED',
      componentId: 'form1',
      payload: { field: 'name', value: 'Alice' },
    });
    const e2 = log.append({
      eventType: 'ACTION_TRIGGERED',
      componentId: 'btn1',
      payload: { action: 'submit' },
    });

    expect(e1.sequence).toBe(0);
    expect(e2.sequence).toBe(1);
    expect(log.size).toBe(2);
  });

  it('chains hashes correctly', () => {
    const log = createLog();
    const e1 = log.append({
      eventType: 'FIELD_CHANGED',
      componentId: 'form1',
      payload: { field: 'name', value: 'Alice' },
    });
    const e2 = log.append({
      eventType: 'FIELD_CHANGED',
      componentId: 'form1',
      payload: { field: 'email', value: 'a@b.c' },
    });

    // First entry's previousHash is the genesis hash
    expect(e1.previousHash).toBe('0000000000000000');
    // Second entry links to first
    expect(e2.previousHash).toBe(e1.hash);
    // Hashes are non-empty hex strings
    expect(e1.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(e2.hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('verifies integrity on valid log', () => {
    const log = createLog();
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: { v: 1 } });
    log.append({ eventType: 'ACTION_TRIGGERED', componentId: 'b1', payload: { v: 2 } });
    log.append({ eventType: 'COMPONENT_RENDERED', componentId: 'c1', payload: {} });

    const result = log.verifyIntegrity();
    expect(result.valid).toBe(true);
    expect(result.brokenAt).toBeUndefined();
  });

  it('detects tampered entry via hash mismatch', () => {
    const log = createLog();
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: { v: 1 } });
    log.append({ eventType: 'ACTION_TRIGGERED', componentId: 'b1', payload: { v: 2 } });

    // toJSON returns references to internal objects, so mutating them
    // effectively tampers with the log
    const entries = log.toJSON();
    entries[0].payload = { v: 'tampered' };

    // The internal entries are still the same objects, so integrity is broken
    const result = log.verifyIntegrity();
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
    expect(result.reason).toContain('Hash mismatch');
  });

  it('returns entries as JSON array', () => {
    const log = createLog();
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: { x: 1 } });
    const json = log.toJSON();
    expect(json).toHaveLength(1);
    expect(json[0].componentId).toBe('f1');
    expect(json[0].hash).toBeDefined();
  });

  it('returns entries as JSONL string', () => {
    const log = createLog();
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: { x: 1 } });
    log.append({ eventType: 'ACTION_TRIGGERED', componentId: 'b1', payload: { y: 2 } });
    const jsonl = log.toJSONL();
    const lines = jsonl.split('\n');
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0]).componentId).toBe('f1');
    expect(JSON.parse(lines[1]).componentId).toBe('b1');
  });

  it('filters by component ID', () => {
    const log = createLog();
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: {} });
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f2', payload: {} });
    log.append({ eventType: 'FIELD_CHANGED', componentId: 'f1', payload: {} });

    const f1Entries = log.forComponent('f1');
    expect(f1Entries).toHaveLength(2);
    const f2Entries = log.forComponent('f2');
    expect(f2Entries).toHaveLength(1);
  });

  it('includes actor when provided', () => {
    const log = createLog();
    const entry = log.append({
      eventType: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      payload: { reason: 'approved' },
      actor: { id: 'user-1', role: 'admin' },
    });
    expect(entry.actor).toEqual({ id: 'user-1', role: 'admin' });
  });

  it('defaults redacted to false', () => {
    const log = createLog();
    const entry = log.append({
      eventType: 'FIELD_CHANGED',
      componentId: 'f1',
      payload: {},
    });
    expect(entry.redacted).toBe(false);
  });

  it('accepts redacted flag', () => {
    const log = createLog();
    const entry = log.append({
      eventType: 'FIELD_CHANGED',
      componentId: 'f1',
      payload: {},
      redacted: true,
    });
    expect(entry.redacted).toBe(true);
  });
});
