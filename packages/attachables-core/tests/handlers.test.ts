import { describe, it, expect, vi } from 'vitest';
import { AttachableRegistry, type AttachableContext } from '@mobile-reality/mdma-runtime';
import {
  formHandler,
  buttonHandler,
  tasklistHandler,
  tableHandler,
  calloutHandler,
  approvalGateHandler,
  webhookHandler,
  registerAllCoreAttachables,
} from '../src/index.js';

function makeContext(overrides: Partial<AttachableContext> = {}): AttachableContext {
  return {
    componentId: 'test-comp',
    dispatch: vi.fn(),
    getState: () => ({}),
    resolveBinding: (expr: string) => expr,
    policy: { enforce: vi.fn() },
    ...overrides,
  };
}

describe('formHandler', () => {
  it('has correct definition', () => {
    expect(formHandler.definition.type).toBe('form');
  });

  it('initializes with default values', () => {
    const ctx = makeContext();
    const state = formHandler.initialize?.(ctx, {
      id: 'f1',
      type: 'form',
      fields: [
        { name: 'email', type: 'email', label: 'Email' },
        { name: 'agree', type: 'checkbox', label: 'Agree' },
      ],
      onSubmit: 'submit-f1',
    });
    expect(state.values.email).toBe('');
    expect(state.values.agree).toBe(false);
  });
});

describe('buttonHandler', () => {
  it('initializes correctly', () => {
    const ctx = makeContext();
    const state = buttonHandler.initialize?.(ctx, {
      id: 'btn1',
      type: 'button',
      text: 'Go',
      onAction: 'go',
    });
    expect(state.type).toBe('button');
  });
});

describe('tasklistHandler', () => {
  it('initializes items as unchecked', () => {
    const ctx = makeContext();
    const state = tasklistHandler.initialize?.(ctx, {
      id: 'tl1',
      type: 'tasklist',
      items: [
        { id: 'i1', text: 'Do thing' },
        { id: 'i2', text: 'Do other', checked: true },
      ],
    });
    expect(state.values.i1).toBe(false);
    expect(state.values.i2).toBe(true);
  });
});

describe('tableHandler', () => {
  it('initializes with sort state', () => {
    const ctx = makeContext();
    const state = tableHandler.initialize?.(ctx, {
      id: 'tbl1',
      type: 'table',
      columns: [{ key: 'name', header: 'Name' }],
      data: [],
    });
    expect(state.values.sortColumn).toBeNull();
    expect(state.values.sortDirection).toBe('asc');
  });
});

describe('calloutHandler', () => {
  it('initializes as not dismissed', () => {
    const ctx = makeContext();
    const state = calloutHandler.initialize?.(ctx, {
      id: 'c1',
      type: 'callout',
      content: 'Warning!',
      variant: 'warning',
    });
    expect(state.values.dismissed).toBe(false);
  });
});

describe('approvalGateHandler', () => {
  it('initializes as pending', () => {
    const ctx = makeContext();
    const state = approvalGateHandler.initialize?.(ctx, {
      id: 'gate1',
      type: 'approval-gate',
      title: 'Manager Approval',
    });
    expect(state.values.status).toBe('pending');
  });
});

describe('webhookHandler', () => {
  it('initializes as idle', () => {
    const ctx = makeContext();
    const state = webhookHandler.initialize?.(ctx, {
      id: 'wh1',
      type: 'webhook',
      url: 'https://api.example.com/hook',
      trigger: 'submit',
    });
    expect(state.values.status).toBe('idle');
  });
});

describe('registerAllCoreAttachables', () => {
  it('registers all 7 handlers', () => {
    const registry = new AttachableRegistry();
    registerAllCoreAttachables(registry);
    expect(registry.size).toBe(7);
    expect(registry.has('form')).toBe(true);
    expect(registry.has('button')).toBe(true);
    expect(registry.has('tasklist')).toBe(true);
    expect(registry.has('table')).toBe(true);
    expect(registry.has('callout')).toBe(true);
    expect(registry.has('approval-gate')).toBe(true);
    expect(registry.has('webhook')).toBe(true);
  });
});
