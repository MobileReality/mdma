import type { MdmaRoot, MdmaBlock, StoreAction, EventType } from '@mobile-reality/mdma-spec';
import { createEventBus, type TypedEventBus } from './event-bus.js';
import { createEventLog, type AppendOnlyEventLog } from './event-log.js';
import { resolveValue } from './binding-resolver.js';
import { redactPayload, type RedactionContext } from '../redaction/redactor.js';
import { PolicyEngine, createDefaultPolicy } from '../policy/policy-engine.js';
import type { AttachableRegistry, ComponentState } from '../attachable/registry.js';

export interface DocumentState {
  bindings: Record<string, unknown>;
  components: Map<string, ComponentState>;
}

export interface DocumentStoreOptions {
  sessionId?: string;
  documentId?: string;
  environment?: string;
  policy?: import('@mobile-reality/mdma-spec').Policy;
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
  /** Incrementally update the store from a new AST — adds new components,
   *  removes deleted ones, and preserves existing component state (values, touched, etc.). */
  updateAst(ast: MdmaRoot): void;
}

export function createDocumentStore(
  ast: MdmaRoot,
  options: DocumentStoreOptions = {},
): DocumentStore {
  const sessionId = options.sessionId ?? crypto.randomUUID();
  const documentId = options.documentId ?? `doc-${Date.now()}`;
  const environment = options.environment ?? 'preview';
  const policy = new PolicyEngine(options.policy ?? createDefaultPolicy(), environment);
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
            if (!state.bindings[comp.id] || typeof state.bindings[comp.id] !== 'object') {
              state.bindings[comp.id] = {};
            }
            (state.bindings[comp.id] as Record<string, unknown>)[field.name] = field.defaultValue;
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
    payload.type = undefined;
    payload.componentId = undefined;

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
        'actor' in action ? (action as { actor: { id: string; role?: string } }).actor : undefined,
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
            comp.values = { ...comp.values, [action.field]: action.value };
            comp.touched = true;
            // Store both flat (for backward compat) and nested (for {{componentId.field}} resolution)
            state.bindings[action.field] = action.value;
            if (
              !state.bindings[action.componentId] ||
              typeof state.bindings[action.componentId] !== 'object'
            ) {
              state.bindings[action.componentId] = {};
            }
            (state.bindings[action.componentId] as Record<string, unknown>)[action.field] =
              action.value;
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
            comp.values = { ...comp.values, status: 'approved', approvedBy: action.actor };
            state.bindings[`${action.componentId}.status`] = 'approved';
          }
          break;
        }
        case 'APPROVAL_DENIED': {
          const comp = state.components.get(action.componentId);
          if (comp) {
            comp.values = {
              ...comp.values,
              status: 'denied',
              deniedBy: action.actor,
              deniedReason: action.reason,
            };
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

    updateAst(newAst: MdmaRoot) {
      // Collect new component IDs from the updated AST
      const newIds = new Set<string>();
      for (const child of newAst.children) {
        if (isMdmaBlock(child)) {
          newIds.add(child.component.id);
        } else if (isPendingMdmaBlock(child)) {
          // During streaming, a previously-parsed block may temporarily revert
          // to a code node (incomplete YAML). Extract its ID from partial YAML
          // so we preserve its state instead of deleting it.
          const pendingId = extractIdFromYaml((child as { value?: string }).value);
          if (pendingId) newIds.add(pendingId);
        }
      }

      // Remove components that no longer exist in the new AST
      for (const id of state.components.keys()) {
        if (!newIds.has(id)) {
          state.components.delete(id);
          redactionCtx.sensitiveComponents.delete(id);
        }
      }

      // Add new components, preserve existing ones
      for (const child of newAst.children) {
        if (!isMdmaBlock(child)) continue;
        const comp = child.component;

        // If this component already exists, keep its state
        if (state.components.has(comp.id)) continue;

        // New component — initialize with defaults
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

        if (comp.type === 'form') {
          for (const field of comp.fields) {
            if (field.sensitive) {
              redactionCtx.sensitiveFields.add(field.name);
            }
            if (field.defaultValue !== undefined) {
              compState.values[field.name] = field.defaultValue;
              // Only set binding if not already set by user interaction
              if (!(field.name in state.bindings)) {
                state.bindings[field.name] = field.defaultValue;
              }
              if (!state.bindings[comp.id] || typeof state.bindings[comp.id] !== 'object') {
                state.bindings[comp.id] = {};
              }
              const nested = state.bindings[comp.id] as Record<string, unknown>;
              if (!(field.name in nested)) {
                nested[field.name] = field.defaultValue;
              }
            }
          }
        }

        state.components.set(comp.id, compState);
      }

      notify();
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

/** Detect code blocks with lang="mdma" that weren't converted to MdmaBlock
 *  (incomplete YAML during streaming or validation failure). */
function isPendingMdmaBlock(node: unknown): boolean {
  return (
    typeof node === 'object' &&
    node !== null &&
    'type' in node &&
    (node as { type: string }).type === 'code' &&
    'lang' in node &&
    (node as { lang: string }).lang === 'mdma'
  );
}

/** Extract the `id` field from partial YAML content. */
function extractIdFromYaml(yaml?: string): string | null {
  if (!yaml) return null;
  const match = yaml.match(/^\s*id:\s*(\S+)/m);
  return match ? match[1] : null;
}
