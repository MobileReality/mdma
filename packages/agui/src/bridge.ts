import type { AttachableRegistry, DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot, StoreAction } from '@mobile-reality/mdma-spec';
import { containsMdma } from './contains-mdma.js';
import { parseMdma } from './parse.js';
import type { AguiAgent, AguiSubscriber, AguiSubscription } from './types.js';

/** The store actions that represent a user decision worth routing back to the agent. */
export type MdmaActionEvent = Extract<
  StoreAction,
  { type: 'ACTION_TRIGGERED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED' }
>;

const ACTION_TYPES = new Set<StoreAction['type']>([
  'ACTION_TRIGGERED',
  'APPROVAL_GRANTED',
  'APPROVAL_DENIED',
]);

/** Live render state for a single streamed assistant message. */
export interface MdmaMessageState {
  messageId: string;
  content: string;
  ast: MdmaRoot;
  store: DocumentStore;
}

export interface MdmaAgentBridgeOptions {
  /** Debounce window between re-parses of a streaming message. Default 150ms. */
  throttleMs?: number;
  /** Registry factory for the document store (defaults to the core attachables). */
  createRegistry?: () => AttachableRegistry;
  /**
   * Called whenever a message's store is created or updated from newly parsed MDMA — the hook
   * point for a UI to (re)render. Fires with the same store instance across a message's lifetime.
   */
  onDocument?: (message: MdmaMessageState) => void;
  /**
   * Called when the user triggers an action (submit / approve / deny) inside a rendered
   * document. Return `false` to take over resumption yourself (e.g. resolve an AG-UI interrupt
   * so the parked run continues with state intact); return `true` or nothing to let the bridge
   * perform its default resume (`addMessage` + `runAgent`).
   */
  onAction?: (
    action: MdmaActionEvent,
    message: MdmaMessageState,
  ) => boolean | void | Promise<boolean> | Promise<void>;
  /**
   * Override the default resume behavior. When provided it fully replaces `addMessage`+`runAgent`.
   */
  resume?: (
    action: MdmaActionEvent,
    message: MdmaMessageState,
    agent: AguiAgent,
  ) => void | Promise<void>;
  /** Injectable clock (ms). Defaults to `Date.now`; overridden in tests. */
  now?: () => number;
}

export interface MdmaAgentBridge {
  /** Message states keyed by AG-UI message id. */
  readonly documents: ReadonlyMap<string, MdmaMessageState>;
  /** Force an immediate re-parse of a message's latest buffered content (or all pending). */
  flush(messageId?: string): Promise<void>;
  /** Detach from the agent and drop all per-message stores/subscriptions. */
  dispose(): void;
}

interface PendingBuffer {
  latest: string;
  lastParseAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  /** Monotonic parse request id — guards "latest content wins" across async parses. */
  seq: number;
  applied: number;
}

/**
 * Bridge an AG-UI agent to MDMA rendering. Subscribes to the agent's streamed text, parses any
 * embedded MDMA into a per-message document store (created once, then `updateAst`-ed), and routes
 * the resulting user actions back into the agent run.
 */
export function createMdmaAgentBridge(
  agent: AguiAgent,
  options: MdmaAgentBridgeOptions = {},
): MdmaAgentBridge {
  const throttleMs = options.throttleMs ?? 150;
  const now = options.now ?? Date.now;

  const documents = new Map<string, MdmaMessageState>();
  const pending = new Map<string, PendingBuffer>();
  const actionUnsubs = new Map<string, () => void>();
  let disposed = false;

  async function reparse(messageId: string): Promise<void> {
    const buf = pending.get(messageId);
    if (!buf || disposed) return;

    const content = buf.latest;
    const requestSeq = ++buf.seq;
    buf.lastParseAt = now();

    const existing = documents.get(messageId);
    let result: { ast: MdmaRoot; store: DocumentStore };
    try {
      result = await parseMdma(content, {
        existingStore: existing?.store,
        createRegistry: options.createRegistry,
      });
    } catch {
      // Partial/invalid MDMA mid-stream is expected; keep the last good render.
      return;
    }

    // Latest-content-wins: a newer parse for this message already landed — drop this one.
    if (disposed || requestSeq <= buf.applied) return;
    buf.applied = requestSeq;

    const state: MdmaMessageState = { messageId, content, ast: result.ast, store: result.store };
    const isNewStore = !existing || existing.store !== result.store;
    documents.set(messageId, state);

    if (isNewStore) attachActions(state);
    options.onDocument?.(state);
  }

  function attachActions(state: MdmaMessageState): void {
    actionUnsubs.get(state.messageId)?.();
    const unsub = state.store.getEventBus().onAny((action) => {
      if (!ACTION_TYPES.has(action.type)) return;
      void handleAction(action as MdmaActionEvent, state.messageId);
    });
    actionUnsubs.set(state.messageId, unsub);
  }

  async function handleAction(action: MdmaActionEvent, messageId: string): Promise<void> {
    const state = documents.get(messageId);
    if (!state || disposed) return;

    const decision = await options.onAction?.(action, state);
    if (decision === false) return; // host takes over (e.g. resolves an interrupt)

    if (options.resume) {
      await options.resume(action, state, agent);
      return;
    }
    // Default resume: hand the decision back as a user turn and re-run the agent.
    // `id` is required by AG-UI's Message schema, so always mint one.
    agent.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: JSON.stringify(serializeAction(action)),
    });
    await agent.runAgent();
  }

  function ingest(messageId: string, content: string, immediate: boolean): void {
    if (disposed || !containsMdma(content)) return;

    let buf = pending.get(messageId);
    if (!buf) {
      buf = { latest: content, lastParseAt: 0, timer: null, seq: 0, applied: 0 };
      pending.set(messageId, buf);
    } else {
      buf.latest = content;
    }

    if (immediate) {
      if (buf.timer) {
        clearTimeout(buf.timer);
        buf.timer = null;
      }
      void reparse(messageId);
      return;
    }

    const elapsed = now() - buf.lastParseAt;
    if (elapsed >= throttleMs) {
      void reparse(messageId);
    } else if (!buf.timer) {
      buf.timer = setTimeout(() => {
        buf!.timer = null;
        void reparse(messageId);
      }, throttleMs - elapsed);
    }
  }

  const subscriber: AguiSubscriber = {
    // During streaming, AG-UI's content buffer lags one delta behind — good enough for a live
    // (slightly-behind) render, throttled to avoid re-parsing every token.
    onTextMessageContentEvent: (params) => ingest(params.event.messageId, params.textMessageBuffer, false),
    // The end buffer is the COMPLETE message, so parse it immediately — this is what guarantees
    // the final render isn't a truncated tail (content events never carry the last delta).
    onTextMessageEndEvent: (params) => ingest(params.event.messageId, params.textMessageBuffer, true),
    // Belt-and-suspenders: a run that ends without a text-end (e.g. tool transport) still flushes.
    onRunFinishedEvent: () => flush(),
    onRunFailedEvent: () => flush(),
  };

  const subscription: AguiSubscription = agent.subscribe(subscriber);

  async function flush(messageId?: string): Promise<void> {
    const ids = messageId ? [messageId] : [...pending.keys()];
    await Promise.all(
      ids.map((id) => {
        const buf = pending.get(id);
        if (buf?.timer) {
          clearTimeout(buf.timer);
          buf.timer = null;
        }
        return reparse(id);
      }),
    );
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    subscription.unsubscribe();
    for (const buf of pending.values()) {
      if (buf.timer) clearTimeout(buf.timer);
    }
    for (const unsub of actionUnsubs.values()) unsub();
    actionUnsubs.clear();
    pending.clear();
    documents.clear();
  }

  return { documents, flush, dispose };
}

/** Flatten a store action into a plain, serializable decision payload for the resume message. */
function serializeAction(action: MdmaActionEvent): Record<string, unknown> {
  switch (action.type) {
    case 'ACTION_TRIGGERED':
      return {
        kind: 'action',
        componentId: action.componentId,
        actionId: action.actionId,
        payload: action.payload,
      };
    case 'APPROVAL_GRANTED':
      return { kind: 'approval', decision: 'granted', componentId: action.componentId, actor: action.actor };
    case 'APPROVAL_DENIED':
      return {
        kind: 'approval',
        decision: 'denied',
        componentId: action.componentId,
        actor: action.actor,
        reason: action.reason,
      };
  }
}
