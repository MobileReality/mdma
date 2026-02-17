import { describe, it, expect, vi } from 'vitest';
import { createEventBus } from '../src/core/event-bus.js';

describe('EventBus', () => {
  it('dispatches events to typed handlers', () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.on('FIELD_CHANGED', handler);
    bus.emit({ type: 'FIELD_CHANGED', componentId: 'f', field: 'name', value: 'Alice' });

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith({
      type: 'FIELD_CHANGED',
      componentId: 'f',
      field: 'name',
      value: 'Alice',
    });
  });

  it('does not call handlers for other event types', () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.on('APPROVAL_GRANTED', handler);
    bus.emit({ type: 'FIELD_CHANGED', componentId: 'f', field: 'x', value: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports unsubscribe', () => {
    const bus = createEventBus();
    const handler = vi.fn();

    const unsub = bus.on('FIELD_CHANGED', handler);
    unsub();
    bus.emit({ type: 'FIELD_CHANGED', componentId: 'f', field: 'x', value: 1 });

    expect(handler).not.toHaveBeenCalled();
  });

  it('supports onAny for all events', () => {
    const bus = createEventBus();
    const handler = vi.fn();

    bus.onAny(handler);
    bus.emit({ type: 'FIELD_CHANGED', componentId: 'f', field: 'x', value: 1 });
    bus.emit({ type: 'COMPONENT_RENDERED', componentId: 'c' });

    expect(handler).toHaveBeenCalledTimes(2);
  });
});
