import type { MdmaRoot, MdmaBlock, StoreAction, EventType } from '@mdma/spec';
import { createEventBus, type TypedEventBus } from './event-bus.js';
import { createEventLog, type AppendOnlyEventLog } from './event-log.js';
import { resolveValue, resolveBindingPath } from './binding-resolver.js';
import { redactPayload, type RedactionContext } from '../redaction/redactor.js';
import { PolicyEngine, createDefaultPolicy } from '../policy/policy-engine.js';
import { AttachableRegistry, type ComponentState } from '../attachable/registry.js';

export interface DocumentState {
  bindings: Record<string, unknown>;
  components: Map<string, ComponentState>;
}

export interface DocumentStoreOptions {
  sessionId?: string;
  documentId?: string;
  environment?: string;
  policy?: import('@mdma/spec').Policy;
  registry?: AttachableRegistry;
}

export interface DocumentStore {
  getState(): Readonly<DocumentState>;
  getBindings(): Readonly<Record<string, unknown>>;
  getComponentState(id: string): ComponentState | undefined;
  resolveBinding(expr: string): unknown;
  dispatch(action: StoreAction): void;
  subscribe(listener: (state: DocumentState) => void): () => void;
  getEventLog(): AppendOnlyEventLog;
  getEventBus(): TypedEventBus;
  getPolicyEngine(): PolicyEngine;
}

export function createDocumentStore(
  ast: MdmaRoot,
  options: DocumentStoreOptions = {},
): DocumentStore {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const documentId = options.documentId ?? 'doc-' + Date.now();
  const environment = options.environment ?? 'preview';
  const policy = new PolicyEngine(options.policy ?? createDefaultPolicy(), environment);
  const registry = options.registry ?? new AttachableRegistry();

  const eventBus = createEventBus();
  const eventLog = createEventLog({ sessionId, documentId });

  const state: DocumentState = {
    bindings: {},
    components: new Map(),
  };

  // Build redaction context from AST
  const redactionCtx: RedactionContext = {
    sensitiveComponents: new Set<string>(),
    sensitiveFields: new Set<string>(),
  };

  // Initialize components from AST
  for (const child of ast.children) {
    if (isMdmaBlock(child)) {
      const comp = child.component;
      const compState: ComponentState = {
        id: comp.id,
        type: comp.type,
        values: {},
        errors: [],
        touched: false,
        visible: resolveValue(comp.visible, state.bindings) !== false,
        disabled: resolveValue(comp.disabled, state.bindings) === true,
      };

      if (comp.sensitive) {
        redactionCtx.sensitiveComponents.add(comp.id);
      }

      // Extract sensitive fields from form components
      if (comp.type === 'form') {
        for (const field of comp.fields) {
          if (field.sensitive) {
            redactionCtx.sensitiveFields.add(field.name);
          }
          if (field.defaultValue !== undefined) {
            compState.values[field.name] = field.defaultValue;
            state.bindings[field.name] = field.defaultValue;
          }
        }
      }

      state.components.set(comp.id, compState);
    }
  }

  const listeners = new Set<(state: DocumentState) => void>();

  function notify() {
    for (const listener of listeners) {
      listener(state);
    }
  }

  function logAction(action: StoreAction) {
    const eventTypeMap: Record<StoreAction['type'], EventType> = {
      FIELD_CHANGED: 'field_changed',
      ACTION_TRIGGERED: 'action_triggered',
      COMPONENT_RENDERED: 'component_rendered',
      APPROVAL_GRANTED: 'approval_granted',
      APPROVAL_DENIED: 'approval_denied',
      INTEGRATION_CALLED: 'integration_called',
    };

    const payload = { ...action } as Record<string, unknown>;
    delete payload.type;
    delete payload.componentId;

    // For FIELD_CHANGED, check if the field itself is sensitive
    let effectiveCtx = redactionCtx;
    if (action.type === 'FIELD_CHANGED' && redactionCtx.sensitiveFields.has(action.field)) {
      effectiveCtx = {
        ...redactionCtx,
        sensitiveFields: new Set([...redactionCtx.sensitiveFields, 'value']),
      };
    }

    const { payload: redacted, redacted: wasRedacted } = redactPayload(
      payload,
      action.componentId,
      effectiveCtx,
    );

    eventLog.append({
      eventType: eventTypeMap[action.type],
      componentId: action.componentId,
      payload: redacted,
      redacted: wasRedacted,
      actor:
        'actor' in action
          ? (action as { actor: { id: string; role?: string } }).actor
          : undefined,
    });
  }

  const store: DocumentStore = {
    getState() {
      return state;
    },

    getBindings() {
      return state.bindings;
    },

    getComponentState(id) {
      return state.components.get(id);
    },

    resolveBinding(expr) {
      return resolveValue(expr, state.bindings);
    },

    dispatch(action) {
      // Log the action
      logAction(action);

      // Emit on bus
      eventBus.emit(action);

      // Process the action
      switch (action.type) {
        case 'FIELD_CHANGED': {
          const comp = state.components.get(action.componentId);
          if (comp) {
            comp.values[action.field] = action.value;
            comp.touched = true;
            state.bindings[action.field] = action.value;
          }
          break;
        }
        case 'COMPONENT_RENDERED': {
          // No state change needed
          break;
        }
        case 'APPROVAL_GRANTED': {
          const comp = state.components.get(action.componentId);
          if (comp) {
            comp.values['status'] = 'approved';
            comp.values['approvedBy'] = action.actor;
            state.bindings[`${action.componentId}.status`] = 'approved';
          }
          break;
        }
        case 'APPROVAL_DENIED': {
          const comp = state.components.get(action.componentId);
          if (comp) {
            comp.values['status'] = 'denied';
            comp.values['deniedBy'] = action.actor;
            comp.values['deniedReason'] = action.reason;
            state.bindings[`${action.componentId}.status`] = 'denied';
          }
          break;
        }
        case 'ACTION_TRIGGERED':
        case 'INTEGRATION_CALLED':
          // Handled by attachable handlers
          break;
      }

      notify();
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getEventLog() {
      return eventLog;
    },

    getEventBus() {
      return eventBus;
    },

    getPolicyEngine() {
      return policy;
    },
  };

  return store;
}

function isMdmaBlock(node: unknown): node is MdmaBlock {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'mdmaBlock'
  );
}
