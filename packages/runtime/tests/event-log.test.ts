import { describe, it, expect } from 'vitest';
import { createEventLog } from '../src/core/event-log.js';

describe('EventLog', () => {
  it('appends entries with metadata', () => {
    const log = createEventLog({ sessionId: '550e8400-e29b-41d4-a716-446655440000', documentId: 'doc-1' });

    const entry = log.append({
      eventType: 'field_changed',
      componentId: 'form-1',
      payload: { field: 'name', value: 'Alice' },
    });

    expect(entry.sessionId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(entry.documentId).toBe('doc-1');
    expect(entry.eventType).toBe('field_changed');
    expect(entry.redacted).toBe(false);
    expect(entry.timestamp).toBeTruthy();
  });

  it('tracks entries count', () => {
    const log = createEventLog({ sessionId: '550e8400-e29b-41d4-a716-446655440000', documentId: 'doc-1' });
    expect(log.size()).toBe(0);

    log.append({ eventType: 'component_rendered', componentId: 'c1', payload: {} });
    log.append({ eventType: 'component_rendered', componentId: 'c2', payload: {} });

    expect(log.size()).toBe(2);
  });

  it('filters by component', () => {
    const log = createEventLog({ sessionId: '550e8400-e29b-41d4-a716-446655440000', documentId: 'doc-1' });

    log.append({ eventType: 'field_changed', componentId: 'form-1', payload: {} });
    log.append({ eventType: 'field_changed', componentId: 'form-2', payload: {} });
    log.append({ eventType: 'field_changed', componentId: 'form-1', payload: {} });

    expect(log.forComponent('form-1')).toHaveLength(2);
    expect(log.forComponent('form-2')).toHaveLength(1);
  });
});
