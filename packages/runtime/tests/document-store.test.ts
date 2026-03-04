import { describe, it, expect, vi } from 'vitest';
import { createDocumentStore } from '../src/core/document-store.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

function makeAst(components: Array<Record<string, unknown>>): MdmaRoot {
  return {
    type: 'root',
    children: components.map((comp) => ({
      type: 'mdmaBlock' as const,
      rawYaml: '',
      component: comp,
    })),
  } as unknown as MdmaRoot;
}

describe('DocumentStore', () => {
  it('initializes from AST', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [
          { name: 'email', type: 'email', label: 'Email', required: true, sensitive: true },
        ],
      },
    ]);

    const store = createDocumentStore(ast);
    const state = store.getState();

    expect(state.components.size).toBe(1);
    expect(state.components.get('form1')?.type).toBe('form');
  });

  it('dispatches FIELD_CHANGED and updates state', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [{ name: 'name', type: 'text', label: 'Name' }],
      },
    ]);

    const store = createDocumentStore(ast);
    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'form1',
      field: 'name',
      value: 'Alice',
    });

    const comp = store.getComponentState('form1');
    expect(comp?.values.name).toBe('Alice');
    expect(comp?.touched).toBe(true);
    expect(store.getBindings().name).toBe('Alice');
  });

  it('resolves bindings', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [{ name: 'city', type: 'text', label: 'City', defaultValue: 'Warsaw' }],
      },
    ]);

    const store = createDocumentStore(ast);
    expect(store.resolveBinding('{{city}}')).toBe('Warsaw');
  });

  it('notifies subscribers on dispatch', () => {
    const ast = makeAst([
      {
        id: 'btn',
        type: 'button',
        text: 'Go',
        onAction: 'go',
        sensitive: false,
        disabled: false,
        visible: true,
      },
    ]);

    const store = createDocumentStore(ast);
    const listener = vi.fn();
    store.subscribe(listener);

    store.dispatch({ type: 'COMPONENT_RENDERED', componentId: 'btn' });
    expect(listener).toHaveBeenCalledOnce();
  });

  it('logs events to the event log', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [{ name: 'x', type: 'text', label: 'X' }],
      },
    ]);

    const store = createDocumentStore(ast);
    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'form1',
      field: 'x',
      value: 'test',
    });

    const log = store.getEventLog();
    expect(log.size()).toBe(1);
    expect(log.entries()[0].eventType).toBe('field_changed');
  });

  it('redacts sensitive fields in event log', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [
          { name: 'email', type: 'email', label: 'Email', sensitive: true },
        ],
      },
    ]);

    const store = createDocumentStore(ast);
    store.dispatch({
      type: 'FIELD_CHANGED',
      componentId: 'form1',
      field: 'email',
      value: 'secret@example.com',
    });

    const entries = store.getEventLog().entries();
    expect(entries[0].redacted).toBe(true);
    expect(entries[0].payload.value).not.toBe('secret@example.com');
    expect(String(entries[0].payload.value)).toMatch(/^redacted:/);
  });

  it('handles APPROVAL_GRANTED', () => {
    const ast = makeAst([
      {
        id: 'gate1',
        type: 'approval-gate',
        title: 'Approve',
        sensitive: false,
        disabled: false,
        visible: true,
      },
    ]);

    const store = createDocumentStore(ast);
    store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'user-1', role: 'manager' },
    });

    const comp = store.getComponentState('gate1');
    expect(comp?.values.status).toBe('approved');
    expect(store.getBindings()['gate1.status']).toBe('approved');
  });

  it('handles APPROVAL_DENIED', () => {
    const ast = makeAst([
      {
        id: 'gate1',
        type: 'approval-gate',
        title: 'Approve',
        sensitive: false,
        disabled: false,
        visible: true,
      },
    ]);

    const store = createDocumentStore(ast);
    store.dispatch({
      type: 'APPROVAL_DENIED',
      componentId: 'gate1',
      actor: { id: 'user-2' },
      reason: 'Not ready',
    });

    const comp = store.getComponentState('gate1');
    expect(comp?.values.status).toBe('denied');
    expect(comp?.values.deniedReason).toBe('Not ready');
  });
});
