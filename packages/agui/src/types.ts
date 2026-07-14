/**
 * The **entire** slice of `@ag-ui/client`'s `AbstractAgent` / `AgentSubscriber` and
 * `@ag-ui/core`'s `Message` that this adapter touches, expressed as narrow structural
 * interfaces. A real `HttpAgent` (or any `AbstractAgent` subclass) satisfies them by shape, so
 * the bridge needs no compile-time dependency on AG-UI — the coupling lives only here.
 *
 * These are **not blind shims**: `tests/agui-conformance.ts` asserts (at type-check time,
 * against the installed `@ag-ui/*`) that a real `AbstractAgent` is assignable to {@link AguiAgent}
 * and our {@link AguiSubscriber} is assignable to the real `AgentSubscriber`. If AG-UI's API
 * drifts, `pnpm typecheck` fails here instead of at runtime. Keep this file the single source of
 * that coupling; when the shapes below diverge from upstream, fix them (and the conformance test
 * will confirm the fix).
 */

/**
 * The user turn the bridge hands back on resume — a structural subset of `@ag-ui/core`'s
 * `UserMessage`. `id` and `content` are **required** upstream (messages are zod-validated), so
 * the bridge always supplies both. The bridge only ever emits user messages; hosts that need
 * other roles drive their own agent via the `resume` option.
 */
export interface AguiMessage {
  id: string;
  role: 'user';
  content: string;
}

/** The raw `TEXT_MESSAGE_CONTENT` event payload — we only read `messageId`. */
export interface AguiTextMessageContentEvent {
  messageId: string;
  delta?: string;
}

/**
 * Params handed to `onTextMessageContentEvent`. `textMessageBuffer` is the accumulated message
 * text — but note AG-UI passes it *before* appending the current delta, so during streaming it
 * lags one delta behind. The complete text only arrives via {@link AguiTextMessageEndParams}.
 */
export interface AguiTextMessageContentParams {
  event: AguiTextMessageContentEvent;
  textMessageBuffer: string;
}

/**
 * Params handed to `onTextMessageEndEvent`. Here `textMessageBuffer` is the **complete** message
 * text (every delta applied), so the bridge parses it to guarantee the final render is whole.
 */
export interface AguiTextMessageEndParams {
  event: { messageId: string };
  textMessageBuffer: string;
}

/**
 * The raw `CUSTOM` event payload — the out-of-band channel for MDMA (delivery Option B). We read
 * only `name` (to filter for our events) and `value` (the payload). A structural subset of
 * `@ag-ui/core`'s `CustomEvent`, which has `{ name: string; value?: unknown }`.
 */
export interface AguiCustomEvent {
  name: string;
  value?: unknown;
}

/** Params handed to `onCustomEvent`. */
export interface AguiCustomEventParams {
  event: AguiCustomEvent;
}

/**
 * Agentic-activity params — the slices of `@ag-ui/*`'s tool-call / step / reasoning callbacks the
 * bridge reads to build its activity feed. Each is a structural subset of the real params, so the
 * conformance check still holds. The feed is separate from MDMA rendering: none of these touch the
 * document store.
 */
export interface AguiToolCallStartParams {
  event: { toolCallId: string; toolCallName: string };
}
export interface AguiToolCallArgsParams {
  event: { toolCallId: string };
  toolCallName: string;
  toolCallBuffer: string;
}
export interface AguiToolCallEndParams {
  event: { toolCallId: string };
  toolCallName: string;
  toolCallArgs: Record<string, unknown>;
}
export interface AguiToolCallResultParams {
  event: { toolCallId: string; content: string };
}
export interface AguiStepParams {
  event: { stepName: string };
}
export interface AguiReasoningParams {
  event: { messageId: string };
  reasoningMessageBuffer: string;
}

/**
 * Shared-state params (Phase 4). `STATE_SNAPSHOT` carries the agent's full state; `STATE_DELTA`
 * carries JSON-Patch ops against it. Structural subsets of the real `StateSnapshotEvent` /
 * `StateDeltaEvent`. The bridge treats the state as `componentId → values` to hydrate MDMA stores.
 */
export interface AguiStateSnapshotParams {
  event: { snapshot?: unknown };
}
export interface AguiStateDeltaParams {
  event: { delta?: unknown[] };
}

/**
 * The subset of `AgentSubscriber` the bridge implements. Callbacks return `void | Promise<void>`,
 * a subset of upstream's `MaybePromise<AgentStateMutation | void>`. The run-lifecycle params are
 * `unknown` because the bridge reads nothing from them — it only flushes the final parse.
 *
 * `onCustomEvent` is the out-of-band MDMA source (Option B): a BE that would rather not interleave
 * MDMA into visible assistant prose emits a `CUSTOM` event instead. Both `onRunErrorEvent` (the
 * real `@ag-ui/client` failure callback) and the legacy `onRunFailedEvent` are declared so the
 * flush-fallback fires across the whole supported peer range (`@ag-ui/* >=0.0.30 <0.1.0`).
 */
export interface AguiSubscriber {
  onTextMessageContentEvent?(params: AguiTextMessageContentParams): void | Promise<void>;
  onTextMessageEndEvent?(params: AguiTextMessageEndParams): void | Promise<void>;
  onCustomEvent?(params: AguiCustomEventParams): void | Promise<void>;
  // Agentic activity feed (Phase 2) — surfaced alongside MDMA, never merged into the document store.
  onToolCallStartEvent?(params: AguiToolCallStartParams): void | Promise<void>;
  onToolCallArgsEvent?(params: AguiToolCallArgsParams): void | Promise<void>;
  onToolCallEndEvent?(params: AguiToolCallEndParams): void | Promise<void>;
  onToolCallResultEvent?(params: AguiToolCallResultParams): void | Promise<void>;
  onStepStartedEvent?(params: AguiStepParams): void | Promise<void>;
  onStepFinishedEvent?(params: AguiStepParams): void | Promise<void>;
  onReasoningMessageContentEvent?(params: AguiReasoningParams): void | Promise<void>;
  onReasoningMessageEndEvent?(params: AguiReasoningParams): void | Promise<void>;
  // Shared-state channel (Phase 4) — hydrates MDMA stores from the agent's state.
  onStateSnapshotEvent?(params: AguiStateSnapshotParams): void | Promise<void>;
  onStateDeltaEvent?(params: AguiStateDeltaParams): void | Promise<void>;
  onRunFinishedEvent?(params: unknown): void | Promise<void>;
  onRunErrorEvent?(params: unknown): void | Promise<void>;
  onRunFailedEvent?(params: unknown): void | Promise<void>;
}

/** Return value of `agent.subscribe(...)`. */
export interface AguiSubscription {
  unsubscribe(): void;
}

/**
 * A human-in-the-loop interrupt the run parked on — a structural subset of `@ag-ui/core`'s
 * `Interrupt`. We read `id` (to correlate against the MDMA component the user answered) and
 * `metadata` (an optional `{ componentId }` the BE can set for explicit correlation).
 */
export interface AguiInterrupt {
  id: string;
  reason?: string;
  toolCallId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Params handed to `onRunFinishedEvent`. On a normal finish `outcome` is `"success"`; when the run
 * parks for human input it is `"interrupt"` and `interrupts` lists what needs answering. A subset
 * of the real discriminated union — we read only these two fields.
 */
export interface AguiRunFinishedParams {
  outcome?: 'success' | 'interrupt' | (string & {});
  interrupts?: AguiInterrupt[];
}

/** One resume instruction handed back to a parked run — mirrors `@ag-ui/core`'s `ResumeEntry`. */
export interface AguiResumeEntry {
  interruptId: string;
  payload?: unknown;
}

/** The subset of `AbstractAgent` the bridge calls. `runAgent` accepts `{ resume }` to resolve interrupts. */
export interface AguiAgent {
  subscribe(subscriber: AguiSubscriber): AguiSubscription;
  runAgent(params?: unknown, subscriber?: AguiSubscriber): Promise<unknown>;
  addMessage(message: AguiMessage): void;
}
