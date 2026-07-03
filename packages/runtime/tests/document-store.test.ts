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
        fields: [{ name: 'email', type: 'email', label: 'Email', required: true, sensitive: true }],
      },
    ]);

    const store = createDocumentStore(ast);
    const state = store.getState();

    expect(state.components.size).toBe(1);
    expect(state.components.get('form1')?.type).toBe('form');
  });

  it('hydrates component values from initialState without forging audit events', () => {
    const ast = makeAst([
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [
          { name: 'email', type: 'email', label: 'Email' },
          { name: 'name', type: 'text', label: 'Name' },
        ],
      },
    ]);

    const store = createDocumentStore(ast, {
      initialState: { form1: { email: 'a@b.com', name: 'Alice' } },
    });

    const comp = store.getComponentState('form1');
    expect(comp?.values.email).toBe('a@b.com');
    expect(comp?.values.name).toBe('Alice');
    // Hydration is a restore, not a user interaction — no touched flag, no forged events.
    expect(comp?.touched).toBe(false);
    expect(store.resolveBinding('{{email}}')).toBe('a@b.com');
    expect(store.getEventLog().entries()).toHaveLength(0);
  });

  it('preserves hydrated values across a streaming updateAst re-parse', () => {
    const comps = [
      {
        id: 'form1',
        type: 'form',
        sensitive: false,
        disabled: false,
        visible: true,
        fields: [{ name: 'email', type: 'email', label: 'Email' }],
      },
    ];
    const store = createDocumentStore(makeAst(comps), {
      initialState: { form1: { email: 'a@b.com' } },
    });

    // A later streamed re-parse of the same document must not wipe the hydrated value.
    store.updateAst(makeAst(comps));
    expect(store.getComponentState('form1')?.values.email).toBe('a@b.com');
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
        fields: [{ name: 'email', type: 'email', label: 'Email', sensitive: true }],
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

describe('DocumentStore.updateAst', () => {
  it('preserves in-flight state when a component keeps the same id and type', () => {
    const store = createDocumentStore(
      makeAst([{ id: 'f', type: 'form', fields: [{ name: 'x', type: 'text', label: 'X' }] }]),
    );
    store.dispatch({ type: 'FIELD_CHANGED', componentId: 'f', field: 'x', value: 'typed' });

    // Re-parse of the same component (e.g. a later streamed chunk) must not wipe user input.
    store.updateAst(
      makeAst([{ id: 'f', type: 'form', fields: [{ name: 'x', type: 'text', label: 'X changed' }] }]),
    );
    expect(store.getComponentState('f')?.values.x).toBe('typed');
  });

  it('re-initializes a component when its type changes between parses (streaming placeholder)', () => {
    // Mimics streaming: an early partial parse yields a truncated/unknown type for `deploy-gate`.
    const store = createDocumentStore(makeAst([{ id: 'deploy-gate', type: 'approval-gat' }]));
    expect(store.getComponentState('deploy-gate')?.type).toBe('approval-gat');

    // A later parse resolves the real type — the store must adopt it, not freeze the placeholder.
    store.updateAst(makeAst([{ id: 'deploy-gate', type: 'approval-gate', title: 'Approve deploy' }]));
    expect(store.getComponentState('deploy-gate')?.type).toBe('approval-gate');
  });
});
