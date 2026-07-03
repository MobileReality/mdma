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
 * The subset of `AgentSubscriber` the bridge implements. Callbacks return `void | Promise<void>`,
 * a subset of upstream's `MaybePromise<AgentStateMutation | void>`. The run-lifecycle params are
 * `unknown` because the bridge reads nothing from them — it only flushes the final parse.
 */
export interface AguiSubscriber {
  onTextMessageContentEvent?(params: AguiTextMessageContentParams): void | Promise<void>;
  onTextMessageEndEvent?(params: AguiTextMessageEndParams): void | Promise<void>;
  onRunFinishedEvent?(params: unknown): void | Promise<void>;
  onRunFailedEvent?(params: unknown): void | Promise<void>;
}

/** Return value of `agent.subscribe(...)`. */
export interface AguiSubscription {
  unsubscribe(): void;
}

/** The subset of `AbstractAgent` the bridge calls. */
export interface AguiAgent {
  subscribe(subscriber: AguiSubscriber): AguiSubscription;
  runAgent(params?: unknown, subscriber?: AguiSubscriber): Promise<unknown>;
  addMessage(message: AguiMessage): void;
}
