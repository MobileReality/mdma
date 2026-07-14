import type { AttachableRegistry, DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot, StoreAction } from '@mobile-reality/mdma-spec';
import { containsMdma } from './contains-mdma.js';
import { parseMdma } from './parse.js';
import type {
  AguiAgent,
  AguiCustomEvent,
  AguiInterrupt,
  AguiReasoningParams,
  AguiRunFinishedParams,
  AguiStateDeltaParams,
  AguiStateSnapshotParams,
  AguiStepParams,
  AguiSubscriber,
  AguiSubscription,
  AguiToolCallArgsParams,
  AguiToolCallEndParams,
  AguiToolCallResultParams,
  AguiToolCallStartParams,
} from './types.js';

/** The store actions that represent a user decision worth routing back to the agent. */
export type MdmaActionEvent = Extract<
  StoreAction,
  { type: 'ACTION_TRIGGERED' | 'APPROVAL_GRANTED' | 'APPROVAL_DENIED' | 'INTEGRATION_CALLED' }
>;

/**
 * The `CUSTOM` event `name` that carries out-of-band MDMA (delivery Option B). A BE that prefers
 * not to interleave MDMA into visible assistant prose emits `{ type: 'CUSTOM', name: 'mdma',
 * value }` where `value` is either the markdown string or `{ messageId?, markdown }`. The markdown
 * still contains a ```mdma fence — same format as inline, just on a dedicated channel.
 */
export const MDMA_CUSTOM_EVENT_NAME = 'mdma';

/** Where a message's MDMA text arrived from. */
export type MdmaSourceOrigin = 'text' | 'custom';

/**
 * A single unit of MDMA-bearing text to (re)parse, tagged with where it came from. Generalizing
 * `ingest` over this descriptor is what lets a second delivery channel (the `CUSTOM` event) feed
 * the exact same parse/store/render pipeline as inline assistant text, with no forked code path.
 */
interface MdmaSource {
  messageId: string;
  text: string;
  /** Parse now (complete text) vs. throttle (mid-stream). */
  immediate: boolean;
  origin: MdmaSourceOrigin;
}

const ACTION_TYPES = new Set<StoreAction['type']>([
  'ACTION_TRIGGERED', // button click, form submit, tasklist completion
  'APPROVAL_GRANTED',
  'APPROVAL_DENIED',
  'INTEGRATION_CALLED', // webhook trigger / execution result
]);

/**
 * The agent's shared state as the bridge consumes it (Phase 4): `componentId → values`, the same
 * shape as the document store's `initialState`. New MDMA stores are hydrated from it, so a form
 * the agent re-renders can come up pre-filled from state.
 */
export type MdmaSharedState = Record<string, Record<string, unknown>>;

/** The kinds of agentic activity the bridge surfaces alongside MDMA (Phase 2). */
export type MdmaActivityKind = 'tool' | 'step' | 'reasoning';

/** Whether an activity is still in progress or has completed. */
export type MdmaActivityStatus = 'running' | 'done';

/**
 * One item in the agentic activity feed — a tool call, a run step, or a reasoning stream. This is
 * intentionally *separate* from {@link MdmaMessageState}: tool/step/reasoning events never enter
 * the MDMA document store, they render as their own timeline so agent activity and rendered
 * documents stay cleanly decoupled.
 */
export interface MdmaActivity {
  /** Stable id across an activity's lifetime (tool-call id, step handle, reasoning message id). */
  id: string;
  kind: MdmaActivityKind;
  /** Human label — the tool name, the step name, or `reasoning`. */
  label: string;
  status: MdmaActivityStatus;
  /** Streamed detail — accumulating tool args, the tool result, or the reasoning text. */
  detail?: string;
}

/** Live render state for a single streamed assistant message. */
export interface MdmaMessageState {
  messageId: string;
  content: string;
  ast: MdmaRoot;
  store: DocumentStore;
  /** Which channel this message's MDMA arrived on — inline assistant text or a `CUSTOM` event. */
  source: MdmaSourceOrigin;
}

export interface MdmaAgentBridgeOptions {
  /** Debounce window between re-parses of a streaming message. Default 150ms. */
  throttleMs?: number;
  /** Registry factory for the document store (defaults to the core attachables). */
  createRegistry?: () => AttachableRegistry;
  /**
   * Seed component values when a message's store is first created — e.g. restoring a persisted
   * conversation fetched from a backend so its forms/approvals/tasklists render pre-populated.
   * Keyed by component id → its `values` map (the shape under `getState().components`). Applies
   * only to freshly-created components across the whole conversation; ids absent from a given
   * message are ignored.
   */
  initialState?: Record<string, Record<string, unknown>>;
  /**
   * Called whenever a message's store is created or updated from newly parsed MDMA — the hook
   * point for a UI to (re)render. Fires with the same store instance across a message's lifetime.
   */
  onDocument?: (message: MdmaMessageState) => void;
  /**
   * Called whenever an agentic activity (tool call / step / reasoning) is created or advances.
   * Receives the updated item plus the full ordered feed. Purely observational — activity never
   * affects MDMA rendering.
   */
  onActivity?: (activity: MdmaActivity, feed: readonly MdmaActivity[]) => void;
  /**
   * Called whenever the agent's shared state changes (`STATE_SNAPSHOT` / `STATE_DELTA`). The state
   * (`componentId → values`) is used to hydrate newly-created MDMA stores. Purely observational.
   */
  onState?: (state: Readonly<MdmaSharedState>) => void;
  /**
   * Called when the user triggers a decision (form submit / button / tasklist completion /
   * approve / deny / webhook trigger) inside a rendered document. Return `false` to take over
   * resumption yourself (e.g. resolve an AG-UI interrupt
   * so the parked run continues with state intact); return `true` or nothing to let the bridge
   * perform its default resume (`addMessage` + `runAgent`).
   */
  onAction?: (
    action: MdmaActionEvent,
    message: MdmaMessageState,
  ) => boolean | void | Promise<boolean> | Promise<void>;
  /**
   * How a user decision resumes the run:
   * - `auto` (default) — if the parked run has an interrupt matching the answered component, resolve
   *   THAT interrupt (`runAgent({ resume })`); otherwise fall back to a fresh user turn.
   * - `interrupt` — only ever resolve a matching interrupt; if none matches, do nothing.
   * - `user-turn` — always open a fresh user turn (`addMessage` + `runAgent`), the pre-Phase-3 behavior.
   */
  resumeMode?: 'auto' | 'interrupt' | 'user-turn';
  /** Called when a run parks on human-in-the-loop interrupts, with the full pending set. */
  onInterrupt?: (interrupts: readonly AguiInterrupt[]) => void;
  /**
   * Override the default resume behavior entirely. When provided it fully replaces both the
   * interrupt-resume and user-turn paths.
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
  /** The agentic activity feed (tool calls / steps / reasoning), in first-seen order. */
  readonly activity: readonly MdmaActivity[];
  /** Unresolved human-in-the-loop interrupts the run is currently parked on. */
  readonly interrupts: readonly AguiInterrupt[];
  /** The agent's shared state (`componentId → values`) that hydrates new MDMA stores. */
  readonly state: Readonly<MdmaSharedState>;
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
  /** Channel the latest text arrived on — surfaced on the rendered `MdmaMessageState`. */
  origin: MdmaSourceOrigin;
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
  /** Fallback id counter for `CUSTOM`-delivered MDMA that omits its own `messageId`. */
  let customSeq = 0;
  /** Human-in-the-loop interrupts the most recent run parked on, awaiting a user decision. */
  let pendingInterrupts: AguiInterrupt[] = [];
  /** Agent shared state (Phase 4) — hydrates new MDMA stores; updated by STATE_SNAPSHOT/DELTA. */
  let sharedState: MdmaSharedState = {};

  // Agentic activity feed (Phase 2). Ordered list + id index; steps are keyed by name while running
  // so a STEP_FINISHED can close the matching STEP_STARTED.
  const activity: MdmaActivity[] = [];
  const activityById = new Map<string, MdmaActivity>();
  const runningStepId = new Map<string, string>();
  let stepSeq = 0;

  /** Create or advance an activity item (immutably), then notify. */
  function upsertActivity(id: string, patch: Omit<MdmaActivity, 'id'>): void {
    if (disposed) return;
    const prev = activityById.get(id);
    const next: MdmaActivity = { id, ...patch, detail: patch.detail ?? prev?.detail };
    activityById.set(id, next);
    if (prev) activity[activity.indexOf(prev)] = next;
    else activity.push(next);
    options.onActivity?.(next, activity);
  }

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
        // Hydrate new stores from the static seed overlaid with the agent's shared state (Phase 4).
        initialState: { ...options.initialState, ...sharedState },
      });
    } catch {
      // Partial/invalid MDMA mid-stream is expected; keep the last good render.
      return;
    }

    // Latest-content-wins: a newer parse for this message already landed — drop this one.
    if (disposed || requestSeq <= buf.applied) return;
    buf.applied = requestSeq;

    const state: MdmaMessageState = {
      messageId,
      content,
      ast: result.ast,
      store: result.store,
      source: buf.origin,
    };
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

  /**
   * Find the parked interrupt a given component's decision answers. Prefers an explicit
   * `metadata.componentId`, then an interrupt whose `id` equals the component id (the simplest BE
   * convention), and finally — if exactly one interrupt is pending — that lone interrupt.
   */
  function matchInterrupt(componentId: string | undefined): AguiInterrupt | undefined {
    if (pendingInterrupts.length === 0) return undefined;
    if (componentId) {
      const byMeta = pendingInterrupts.find((i) => i.metadata?.componentId === componentId);
      if (byMeta) return byMeta;
      const byId = pendingInterrupts.find((i) => i.id === componentId);
      if (byId) return byId;
    }
    return pendingInterrupts.length === 1 ? pendingInterrupts[0] : undefined;
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

    const mode = options.resumeMode ?? 'auto';
    // Interrupt-based resume (Phase 3): resolve the parked run in place, preserving its state,
    // instead of opening a fresh user turn. The resumed interrupt is removed from the pending set.
    const interrupt = mode === 'user-turn' ? undefined : matchInterrupt(action.componentId);
    if (interrupt) {
      pendingInterrupts = pendingInterrupts.filter((i) => i.id !== interrupt.id);
      options.onInterrupt?.(pendingInterrupts); // notify the reduced (possibly empty) set
      await agent.runAgent({ resume: [{ interruptId: interrupt.id, payload: serializeAction(action) }] });
      return;
    }
    if (mode === 'interrupt') return; // strict interrupt mode: nothing to resolve → do nothing

    // Default resume: hand the decision back as a user turn and re-run the agent.
    // `id` is required by AG-UI's Message schema, so always mint one.
    agent.addMessage({
      id: crypto.randomUUID(),
      role: 'user',
      content: JSON.stringify(serializeAction(action)),
    });
    await agent.runAgent();
  }

  /** Capture interrupts when a run parks, then flush any final MDMA the run produced. */
  function onRunFinished(params: AguiRunFinishedParams): void {
    if (params.outcome === 'interrupt' && Array.isArray(params.interrupts)) {
      pendingInterrupts = params.interrupts;
      options.onInterrupt?.(pendingInterrupts);
    }
    void flush();
  }

  /**
   * Feed one MDMA-bearing chunk into the parse pipeline, regardless of which channel it arrived
   * on. Text events and `CUSTOM` events both funnel through here — the only difference they carry
   * is the `origin` tag and whether to parse immediately.
   */
  function ingest({ messageId, text, immediate, origin }: MdmaSource): void {
    if (disposed || !containsMdma(text)) return;

    let buf = pending.get(messageId);
    if (!buf) {
      buf = { latest: text, lastParseAt: 0, timer: null, seq: 0, applied: 0, origin };
      pending.set(messageId, buf);
    } else {
      buf.latest = text;
      buf.origin = origin;
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

  /**
   * Out-of-band MDMA delivery (Option B). Filters `CUSTOM` events to our {@link
   * MDMA_CUSTOM_EVENT_NAME}, unpacks the payload — a bare markdown string, or `{ messageId?,
   * markdown }` — and hands it to `ingest`. A stable `messageId` is required to stream a `CUSTOM`
   * document across events; when omitted, each event mints its own id (fine for one-shot delivery).
   */
  function ingestCustom(event: AguiCustomEvent): void {
    if (disposed || event.name !== MDMA_CUSTOM_EVENT_NAME) return;

    let messageId: string | undefined;
    let text: string | undefined;
    const { value } = event;
    if (typeof value === 'string') {
      text = value;
    } else if (value && typeof value === 'object') {
      const v = value as { messageId?: unknown; markdown?: unknown };
      if (typeof v.markdown === 'string') text = v.markdown;
      if (typeof v.messageId === 'string') messageId = v.messageId;
    }
    if (text === undefined) return;

    ingest({ messageId: messageId ?? `mdma-custom-${++customSeq}`, text, immediate: true, origin: 'custom' });
  }

  // --- Agentic activity handlers (Phase 2) — feed only; they never touch the document store. ---

  function onToolStart(p: AguiToolCallStartParams): void {
    upsertActivity(`tool:${p.event.toolCallId}`, {
      kind: 'tool',
      label: p.event.toolCallName,
      status: 'running',
    });
  }
  function onToolArgs(p: AguiToolCallArgsParams): void {
    upsertActivity(`tool:${p.event.toolCallId}`, {
      kind: 'tool',
      label: p.toolCallName,
      status: 'running',
      detail: p.toolCallBuffer,
    });
  }
  function onToolEnd(p: AguiToolCallEndParams): void {
    // Args complete; the call is executing until its result arrives — keep it running.
    upsertActivity(`tool:${p.event.toolCallId}`, {
      kind: 'tool',
      label: p.toolCallName,
      status: 'running',
      detail: JSON.stringify(p.toolCallArgs),
    });
  }
  function onToolResult(p: AguiToolCallResultParams): void {
    const id = `tool:${p.event.toolCallId}`;
    upsertActivity(id, {
      kind: 'tool',
      label: activityById.get(id)?.label ?? 'tool',
      status: 'done',
      detail: p.event.content,
    });
  }
  function onStepStart(p: AguiStepParams): void {
    const id = `step:${++stepSeq}`;
    runningStepId.set(p.event.stepName, id);
    upsertActivity(id, { kind: 'step', label: p.event.stepName, status: 'running' });
  }
  function onStepFinish(p: AguiStepParams): void {
    const id = runningStepId.get(p.event.stepName) ?? `step:${++stepSeq}`;
    runningStepId.delete(p.event.stepName);
    upsertActivity(id, { kind: 'step', label: p.event.stepName, status: 'done' });
  }
  function onReasoning(p: AguiReasoningParams, status: MdmaActivityStatus): void {
    upsertActivity(`reasoning:${p.event.messageId}`, {
      kind: 'reasoning',
      label: 'reasoning',
      status,
      detail: p.reasoningMessageBuffer,
    });
  }

  // --- Shared-state handlers (Phase 4) — hydrate NEW stores via initialState AND push changes into
  // already-rendered components, so a component reflects state that arrives after it was rendered. ---

  /** Apply the current shared state to every live store's matching components (reactive hydration). */
  function applyStateToStores(): void {
    for (const { store } of documents.values()) {
      for (const componentId of Object.keys(sharedState)) {
        const comp = store.getComponentState(componentId);
        if (!comp) continue; // this store doesn't contain that component
        for (const [field, value] of Object.entries(sharedState[componentId])) {
          if (comp.values[field] !== value) {
            store.dispatch({ type: 'FIELD_CHANGED', componentId, field, value });
          }
        }
      }
    }
  }

  function onStateSnapshot(p: AguiStateSnapshotParams): void {
    const snap = p.event.snapshot;
    if (snap && typeof snap === 'object') {
      sharedState = snap as MdmaSharedState;
      applyStateToStores();
      options.onState?.(sharedState);
    }
  }
  function onStateDelta(p: AguiStateDeltaParams): void {
    const ops = p.event.delta;
    if (!Array.isArray(ops) || ops.length === 0) return;
    sharedState = applyJsonPatch(sharedState, ops);
    applyStateToStores();
    options.onState?.(sharedState);
  }

  const subscriber: AguiSubscriber = {
    // During streaming, AG-UI's content buffer lags one delta behind — good enough for a live
    // (slightly-behind) render, throttled to avoid re-parsing every token.
    onTextMessageContentEvent: (params) =>
      ingest({
        messageId: params.event.messageId,
        text: params.textMessageBuffer,
        immediate: false,
        origin: 'text',
      }),
    // The end buffer is the COMPLETE message, so parse it immediately — this is what guarantees
    // the final render isn't a truncated tail (content events never carry the last delta).
    onTextMessageEndEvent: (params) =>
      ingest({
        messageId: params.event.messageId,
        text: params.textMessageBuffer,
        immediate: true,
        origin: 'text',
      }),
    // Out-of-band MDMA delivery (Option B): a CUSTOM event carrying MDMA on a dedicated channel.
    onCustomEvent: (params) => ingestCustom(params.event),
    // Agentic activity feed (Phase 2): tool calls, run steps, and reasoning — observational only.
    onToolCallStartEvent: onToolStart,
    onToolCallArgsEvent: onToolArgs,
    onToolCallEndEvent: onToolEnd,
    onToolCallResultEvent: onToolResult,
    onStepStartedEvent: onStepStart,
    onStepFinishedEvent: onStepFinish,
    onReasoningMessageContentEvent: (params) => onReasoning(params, 'running'),
    onReasoningMessageEndEvent: (params) => onReasoning(params, 'done'),
    // Shared-state channel (Phase 4): hydrate new MDMA stores from the agent's state.
    onStateSnapshotEvent: onStateSnapshot,
    onStateDeltaEvent: onStateDelta,
    // On finish: capture any human-in-the-loop interrupts (Phase 3), then flush the final parse.
    // `onRunErrorEvent` is the real `@ag-ui/client` failure callback; `onRunFailedEvent` covers
    // older peer versions — declaring both keeps the flush firing across the supported range.
    onRunFinishedEvent: (params) => onRunFinished(params as AguiRunFinishedParams),
    onRunErrorEvent: () => flush(),
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
    activity.length = 0;
    activityById.clear();
    runningStepId.clear();
    pendingInterrupts = [];
    sharedState = {};
  }

  return {
    documents,
    activity,
    get interrupts() {
      return pendingInterrupts;
    },
    get state() {
      return sharedState;
    },
    flush,
    dispose,
  };
}

/**
 * Apply a minimal JSON-Patch (`add` / `replace` / `remove`) to a plain object, returning a new
 * object. Enough for `STATE_DELTA` on a `componentId → values` state; not a full RFC-6902 impl
 * (no array index ops, `move`, `copy`, or `test`).
 */
function applyJsonPatch(base: MdmaSharedState, ops: unknown[]): MdmaSharedState {
  const next = JSON.parse(JSON.stringify(base)) as Record<string, unknown>;
  for (const op of ops) {
    if (!op || typeof op !== 'object') continue;
    const { op: kind, path, value } = op as { op?: string; path?: string; value?: unknown };
    if (typeof path !== 'string') continue;
    const keys = path.split('/').filter(Boolean);
    if (keys.length === 0) continue;
    let obj = next;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (typeof obj[k] !== 'object' || obj[k] === null) obj[k] = {};
      obj = obj[k] as Record<string, unknown>;
    }
    const last = keys[keys.length - 1];
    if (kind === 'remove') delete obj[last];
    else obj[last] = value; // add | replace
  }
  return next as MdmaSharedState;
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
      return {
        kind: 'approval',
        decision: 'granted',
        componentId: action.componentId,
        actor: action.actor,
      };
    case 'APPROVAL_DENIED':
      return {
        kind: 'approval',
        decision: 'denied',
        componentId: action.componentId,
        actor: action.actor,
        reason: action.reason,
      };
    case 'INTEGRATION_CALLED':
      return {
        kind: 'integration',
        componentId: action.componentId,
        integrationId: action.integrationId,
        result: action.result,
      };
  }
}
