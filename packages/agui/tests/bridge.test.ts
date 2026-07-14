import { describe, it, expect } from 'vitest';
import { createMdmaAgentBridge, type MdmaMessageState } from '../src/bridge.js';
import { parseMdma } from '../src/parse.js';
import type { AguiAgent, AguiMessage, AguiSubscriber, AguiSubscription } from '../src/types.js';

const FENCE = '```';
const APPROVAL_DOC = [
  'Please review the deploy.',
  '',
  `${FENCE}mdma`,
  'id: gate1',
  'type: approval-gate',
  'title: Approve production deploy',
  FENCE,
  '',
].join('\n');

const FORM_DOC = [
  'Here is your form.',
  '',
  `${FENCE}mdma`,
  'id: form1',
  'type: form',
  'fields:',
  '  - name: email',
  '    type: email',
  '    label: Email',
  'onSubmit: submit-form1',
  FENCE,
  '',
].join('\n');

/** Minimal in-memory AG-UI agent for exercising the bridge. */
class FakeAgent implements AguiAgent {
  subscriber: AguiSubscriber | null = null;
  added: AguiMessage[] = [];
  runs = 0;
  runParams: unknown[] = [];

  subscribe(subscriber: AguiSubscriber): AguiSubscription {
    this.subscriber = subscriber;
    return { unsubscribe: () => (this.subscriber = null) };
  }
  async runAgent(params?: unknown): Promise<unknown> {
    this.runs += 1;
    this.runParams.push(params);
    return undefined;
  }
  addMessage(message: AguiMessage): void {
    this.added.push(message);
  }

  emitRunFinished(outcome: 'success' | 'interrupt', interrupts?: unknown[]): void | Promise<void> {
    return this.subscriber?.onRunFinishedEvent?.({ outcome, interrupts } as never);
  }

  emitContent(messageId: string, textMessageBuffer: string): void | Promise<void> {
    return this.subscriber?.onTextMessageContentEvent?.({
      event: { messageId },
      textMessageBuffer,
    });
  }

  emitEnd(messageId: string, textMessageBuffer: string): void | Promise<void> {
    return this.subscriber?.onTextMessageEndEvent?.({ event: { messageId }, textMessageBuffer });
  }

  emitCustom(name: string, value: unknown): void | Promise<void> {
    return this.subscriber?.onCustomEvent?.({ event: { name, value } });
  }

  // --- agentic activity events ---
  emitToolStart(toolCallId: string, toolCallName: string): void | Promise<void> {
    return this.subscriber?.onToolCallStartEvent?.({ event: { toolCallId, toolCallName } });
  }
  emitToolArgs(
    toolCallId: string,
    toolCallName: string,
    toolCallBuffer: string,
  ): void | Promise<void> {
    return this.subscriber?.onToolCallArgsEvent?.({
      event: { toolCallId },
      toolCallName,
      toolCallBuffer,
    });
  }
  emitToolEnd(
    toolCallId: string,
    toolCallName: string,
    toolCallArgs: Record<string, unknown>,
  ): void | Promise<void> {
    return this.subscriber?.onToolCallEndEvent?.({
      event: { toolCallId },
      toolCallName,
      toolCallArgs,
    });
  }
  emitToolResult(toolCallId: string, content: string): void | Promise<void> {
    return this.subscriber?.onToolCallResultEvent?.({ event: { toolCallId, content } });
  }
  emitStepStart(stepName: string): void | Promise<void> {
    return this.subscriber?.onStepStartedEvent?.({ event: { stepName } });
  }
  emitStepFinish(stepName: string): void | Promise<void> {
    return this.subscriber?.onStepFinishedEvent?.({ event: { stepName } });
  }
  emitReasoning(
    messageId: string,
    reasoningMessageBuffer: string,
    end = false,
  ): void | Promise<void> {
    const params = { event: { messageId }, reasoningMessageBuffer };
    return end
      ? this.subscriber?.onReasoningMessageEndEvent?.(params)
      : this.subscriber?.onReasoningMessageContentEvent?.(params);
  }

  // --- shared-state events (Phase 4) ---
  emitStateSnapshot(snapshot: unknown): void | Promise<void> {
    return this.subscriber?.onStateSnapshotEvent?.({ event: { snapshot } });
  }
  emitStateDelta(delta: unknown[]): void | Promise<void> {
    return this.subscriber?.onStateDeltaEvent?.({ event: { delta } });
  }
}

function astBlockTypes(state: MdmaMessageState | undefined): string[] {
  if (!state) return [];
  return state.ast.children
    .filter(
      (c): c is { type: 'mdmaBlock'; component: { type: string } } =>
        (c as { type?: string }).type === 'mdmaBlock',
    )
    .map((c) => c.component.type);
}

describe('parseMdma', () => {
  it('parses an mdma document into an ast + store and reuses the store on update', async () => {
    const first = await parseMdma(APPROVAL_DOC);
    expect(first.store.getComponentState('gate1')?.type).toBe('approval-gate');

    const second = await parseMdma(`${APPROVAL_DOC}\nmore streamed text`, {
      existingStore: first.store,
    });
    // Same store instance is updated in place — not recreated.
    expect(second.store).toBe(first.store);
  });
});

describe('createMdmaAgentBridge', () => {
  it('renders streamed MDMA into a per-message store', async () => {
    const agent = new FakeAgent();
    const seen: MdmaMessageState[] = [];
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0, onDocument: (m) => seen.push(m) });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    expect(bridge.documents.has('m1')).toBe(true);
    expect(seen.at(-1)?.store.getComponentState('gate1')?.type).toBe('approval-gate');
    bridge.dispose();
  });

  it('parses the complete text on message-end (AG-UI content buffers lag one delta)', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    // Simulate AG-UI: content events carry the buffer *before* the latest delta, so the last
    // chunk (here the tail of `approval-gate` + the rest of the doc) never arrives via content.
    const lagging = APPROVAL_DOC.slice(
      0,
      APPROVAL_DOC.indexOf('approval-gate') + 'approval-gat'.length,
    );
    agent.emitContent('m1', lagging);
    await bridge.flush();

    // Mid-stream the fence is still open, so the truncated block stays pending (no bogus block is
    // rendered — this is what prevents the "Unknown component type" flash).
    expect(astBlockTypes(bridge.documents.get('m1'))).toHaveLength(0);

    // TEXT_MESSAGE_END carries the complete text → the final render is whole.
    agent.emitEnd('m1', APPROVAL_DOC);
    await bridge.flush();
    expect(astBlockTypes(bridge.documents.get('m1'))).toContain('approval-gate');
    bridge.dispose();
  });

  it('never creates a document for a message without an mdma fence', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', 'Just a normal assistant reply, no components here.');
    await bridge.flush();

    expect(bridge.documents.size).toBe(0);
    bridge.dispose();
  });

  it('routes an approval decision back into the agent by default (addMessage + runAgent)', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    store.dispatch({ type: 'APPROVAL_GRANTED', componentId: 'gate1', actor: { id: 'user-42' } });
    await Promise.resolve();

    expect(agent.runs).toBe(1);
    expect(agent.added).toHaveLength(1);
    const payload = JSON.parse(agent.added[0].content as string);
    expect(payload).toMatchObject({ kind: 'approval', decision: 'granted', componentId: 'gate1' });
    bridge.dispose();
  });

  it('hydrates a streamed message store from initialState', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, {
      throttleMs: 0,
      initialState: { form1: { email: 'restored@b.com' } },
    });

    agent.emitContent('m1', FORM_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    expect(store.getComponentState('form1')?.values.email).toBe('restored@b.com');
    bridge.dispose();
  });

  it('routes a webhook INTEGRATION_CALLED back into the agent by default', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    store.dispatch({
      type: 'INTEGRATION_CALLED',
      componentId: 'hook1',
      integrationId: 'webhook',
      result: { status: 'triggered' },
    });
    await Promise.resolve();

    expect(agent.runs).toBe(1);
    expect(agent.added).toHaveLength(1);
    const payload = JSON.parse(agent.added[0].content as string);
    expect(payload).toMatchObject({
      kind: 'integration',
      componentId: 'hook1',
      integrationId: 'webhook',
    });
    bridge.dispose();
  });

  it('routes a tasklist completion (ACTION_TRIGGERED) back into the agent by default', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    store.dispatch({ type: 'ACTION_TRIGGERED', componentId: 'checklist1', actionId: 'done' });
    await Promise.resolve();

    expect(agent.runs).toBe(1);
    const payload = JSON.parse(agent.added[0].content as string);
    expect(payload).toMatchObject({ kind: 'action', componentId: 'checklist1', actionId: 'done' });
    bridge.dispose();
  });

  it('lets the host take over resumption when onAction returns false', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, {
      throttleMs: 0,
      onAction: () => false, // e.g. host resolves an AG-UI interrupt itself
    });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    store.dispatch({
      type: 'APPROVAL_DENIED',
      componentId: 'gate1',
      actor: { id: 'u' },
      reason: 'no',
    });
    await Promise.resolve();

    expect(agent.runs).toBe(0);
    expect(agent.added).toHaveLength(0);
    bridge.dispose();
  });

  it('tags inline-text documents with source "text"', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    expect(bridge.documents.get('m1')?.source).toBe('text');
    bridge.dispose();
  });

  it('renders MDMA delivered out-of-band via a CUSTOM event (Option B)', async () => {
    const agent = new FakeAgent();
    const seen: MdmaMessageState[] = [];
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0, onDocument: (m) => seen.push(m) });

    // Object payload with an explicit messageId → a stable, streamable custom document.
    agent.emitCustom('mdma', { messageId: 'c1', markdown: APPROVAL_DOC });
    await bridge.flush();

    const doc = bridge.documents.get('c1');
    expect(doc?.source).toBe('custom');
    expect(doc?.store.getComponentState('gate1')?.type).toBe('approval-gate');
    // Its actions route back just like a text-delivered document.
    doc!.store.dispatch({ type: 'APPROVAL_GRANTED', componentId: 'gate1', actor: { id: 'u' } });
    await Promise.resolve();
    expect(agent.runs).toBe(1);
    bridge.dispose();
  });

  it('accepts a bare markdown string as the CUSTOM value and mints an id when omitted', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitCustom('mdma', APPROVAL_DOC);
    await bridge.flush();

    expect(bridge.documents.size).toBe(1);
    const doc = [...bridge.documents.values()][0];
    expect(doc.source).toBe('custom');
    expect(doc.store.getComponentState('gate1')?.type).toBe('approval-gate');
    bridge.dispose();
  });

  it('ignores CUSTOM events that are not MDMA or carry no fence', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitCustom('telemetry', { markdown: APPROVAL_DOC }); // wrong name
    agent.emitCustom('mdma', { markdown: 'no components here' }); // right name, no fence
    await bridge.flush();

    expect(bridge.documents.size).toBe(0);
    bridge.dispose();
  });

  it('stops routing after dispose', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();
    const store = bridge.documents.get('m1')!.store;
    bridge.dispose();

    store.dispatch({ type: 'APPROVAL_GRANTED', componentId: 'gate1', actor: { id: 'u' } });
    await Promise.resolve();
    expect(agent.runs).toBe(0);
    expect(agent.subscriber).toBeNull();
  });
});

describe('createMdmaAgentBridge — agentic activity feed', () => {
  it('tracks a tool call from start to result as a single running→done item', () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitToolStart('t1', 'search_docs');
    agent.emitToolArgs('t1', 'search_docs', '{"q":"md');
    agent.emitToolEnd('t1', 'search_docs', { q: 'mdma' });
    expect(bridge.activity).toHaveLength(1);
    expect(bridge.activity[0]).toMatchObject({
      kind: 'tool',
      label: 'search_docs',
      status: 'running',
    });

    agent.emitToolResult('t1', '3 results');
    expect(bridge.activity).toHaveLength(1); // same item, advanced — not a new entry
    expect(bridge.activity[0]).toMatchObject({ kind: 'tool', status: 'done', detail: '3 results' });
    bridge.dispose();
  });

  it('tracks steps and reasoning, in first-seen order, separate from documents', () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitStepStart('plan');
    agent.emitReasoning('r1', 'thinking…');
    agent.emitReasoning('r1', 'thinking… done', true);
    agent.emitStepFinish('plan');

    expect(bridge.activity.map((a) => `${a.kind}:${a.status}`)).toEqual([
      'step:done',
      'reasoning:done',
    ]);
    expect(bridge.activity[0].label).toBe('plan');
    expect(bridge.activity[1].detail).toBe('thinking… done');
    // Activity events never create MDMA documents.
    expect(bridge.documents.size).toBe(0);
    bridge.dispose();
  });

  it('notifies onActivity with the item and the full ordered feed', () => {
    const agent = new FakeAgent();
    const seen: Array<{ id: string; len: number }> = [];
    const bridge = createMdmaAgentBridge(agent, {
      throttleMs: 0,
      onActivity: (item, feed) => seen.push({ id: item.id, len: feed.length }),
    });

    agent.emitToolStart('t1', 'a');
    agent.emitStepStart('s');
    expect(seen).toHaveLength(2);
    expect(seen[1].len).toBe(2);
    bridge.dispose();
  });

  it('clears the feed on dispose', () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });
    agent.emitToolStart('t1', 'a');
    expect(bridge.activity).toHaveLength(1);
    bridge.dispose();
    expect(bridge.activity).toHaveLength(0);
  });
});

describe('createMdmaAgentBridge — interrupt-based resume (Phase 3)', () => {
  async function withParkedGate(options = {}) {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0, ...options });
    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();
    return { agent, bridge };
  }

  it('resolves a matching interrupt in place instead of opening a user turn', async () => {
    const { agent, bridge } = await withParkedGate();
    // Run parks on an interrupt whose id matches the approval-gate component id.
    agent.emitRunFinished('interrupt', [{ id: 'gate1', reason: 'approval required' }]);
    expect(bridge.interrupts).toHaveLength(1);

    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();

    // Resumed the parked run with a resume entry — NOT a fresh user message.
    expect(agent.added).toHaveLength(0);
    expect(agent.runParams).toHaveLength(1);
    expect(agent.runParams[0]).toMatchObject({
      resume: [{ interruptId: 'gate1', payload: { kind: 'approval', decision: 'granted' } }],
    });
    // The resolved interrupt is cleared.
    expect(bridge.interrupts).toHaveLength(0);
    bridge.dispose();
  });

  it('correlates via metadata.componentId when the interrupt id differs', async () => {
    const { agent, bridge } = await withParkedGate();
    agent.emitRunFinished('interrupt', [
      { id: 'int-xyz', reason: 'approve', metadata: { componentId: 'gate1' } },
    ]);

    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();
    expect(agent.runParams[0]).toMatchObject({ resume: [{ interruptId: 'int-xyz' }] });
    bridge.dispose();
  });

  it('falls back to a user turn when no interrupt is pending', async () => {
    const { agent, bridge } = await withParkedGate();
    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();
    expect(agent.added).toHaveLength(1); // user turn
    expect(agent.runParams[0]).toBeUndefined(); // runAgent() with no resume
    bridge.dispose();
  });

  it('resumeMode "user-turn" ignores interrupts entirely', async () => {
    const { agent, bridge } = await withParkedGate({ resumeMode: 'user-turn' });
    agent.emitRunFinished('interrupt', [{ id: 'gate1', reason: 'x' }]);
    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();
    expect(agent.added).toHaveLength(1);
    expect(agent.runParams[0]).toBeUndefined();
    bridge.dispose();
  });

  it('resumeMode "interrupt" does nothing when no interrupt matches', async () => {
    const { agent, bridge } = await withParkedGate({ resumeMode: 'interrupt' });
    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();
    expect(agent.added).toHaveLength(0);
    expect(agent.runs).toBe(0);
    bridge.dispose();
  });

  it('notifies onInterrupt on park and again (reduced) on resolve', async () => {
    const seen: number[] = [];
    const { agent, bridge } = await withParkedGate({
      onInterrupt: (pending: readonly unknown[]) => seen.push(pending.length),
    });
    agent.emitRunFinished('interrupt', [
      { id: 'gate1', reason: 'a' },
      { id: 'other', reason: 'b' },
    ]);
    bridge.documents.get('m1')!.store.dispatch({
      type: 'APPROVAL_GRANTED',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    await Promise.resolve();
    expect(seen).toEqual([2, 1]); // parked with 2, one resolved → 1 remains
    bridge.dispose();
  });
});

describe('createMdmaAgentBridge — shared state (Phase 4)', () => {
  it('hydrates a newly-parsed store from a STATE_SNAPSHOT', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    agent.emitStateSnapshot({ form1: { email: 'state@demo.io' } });
    agent.emitContent('m1', FORM_DOC); // FORM_DOC has id "form1" with an email field
    await bridge.flush();

    expect(bridge.documents.get('m1')!.store.getComponentState('form1')?.values.email).toBe(
      'state@demo.io',
    );
    expect(bridge.state).toEqual({ form1: { email: 'state@demo.io' } });
    bridge.dispose();
  });

  it('reactively hydrates an ALREADY-rendered store when state arrives afterwards', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });

    // Render the form first — no state yet, so the email field is empty.
    agent.emitContent('m1', FORM_DOC);
    await bridge.flush();
    expect(
      bridge.documents.get('m1')!.store.getComponentState('form1')?.values.email,
    ).toBeUndefined();

    // State arrives AFTER the form was rendered → the existing store's field updates in place.
    agent.emitStateSnapshot({ form1: { email: 'late@demo.io' } });
    expect(bridge.documents.get('m1')!.store.getComponentState('form1')?.values.email).toBe(
      'late@demo.io',
    );
    bridge.dispose();
  });

  it('applies a STATE_DELTA (add/replace/remove) and notifies onState', () => {
    const agent = new FakeAgent();
    let updates = 0;
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0, onState: () => updates++ });

    agent.emitStateSnapshot({ form1: { email: 'a@b.com', name: 'x' } });
    agent.emitStateDelta([
      { op: 'replace', path: '/form1/email', value: 'c@d.com' },
      { op: 'add', path: '/form1/topic', value: 'news' },
      { op: 'remove', path: '/form1/name' },
    ]);

    expect(bridge.state).toEqual({ form1: { email: 'c@d.com', topic: 'news' } });
    expect(updates).toBe(2); // one per event
    bridge.dispose();
  });

  it('shared state overrides the static initialState seed when hydrating', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, {
      throttleMs: 0,
      initialState: { form1: { email: 'static@x.com' } },
    });

    agent.emitStateSnapshot({ form1: { email: 'dynamic@x.com' } });
    agent.emitContent('m1', FORM_DOC);
    await bridge.flush();

    expect(bridge.documents.get('m1')!.store.getComponentState('form1')?.values.email).toBe(
      'dynamic@x.com',
    );
    bridge.dispose();
  });

  it('clears shared state on dispose', () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });
    agent.emitStateSnapshot({ a: { x: 1 } });
    expect(bridge.state).toEqual({ a: { x: 1 } });
    bridge.dispose();
    expect(bridge.state).toEqual({});
  });
});

describe('serializeAction — prompt↔adapter contract', () => {
  // These exact shapes are what the model reads on the next turn (as resume payload or user turn).
  // Changing them silently would break agent prompts that parse the decision — pin them here.
  async function serialize(action: Record<string, unknown>): Promise<Record<string, unknown>> {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, { throttleMs: 0 });
    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();
    bridge.documents.get('m1')!.store.dispatch(action as never);
    await Promise.resolve();
    const out = JSON.parse(agent.added[0].content as string);
    bridge.dispose();
    return out;
  }

  it('serializes ACTION_TRIGGERED', async () => {
    expect(
      await serialize({
        type: 'ACTION_TRIGGERED',
        componentId: 'c',
        actionId: 'a',
        payload: { x: 1 },
      }),
    ).toEqual({
      kind: 'action',
      componentId: 'c',
      actionId: 'a',
      payload: { x: 1 },
    });
  });

  it('serializes APPROVAL_GRANTED / APPROVAL_DENIED', async () => {
    expect(
      await serialize({ type: 'APPROVAL_GRANTED', componentId: 'gate1', actor: { id: 'u' } }),
    ).toEqual({
      kind: 'approval',
      decision: 'granted',
      componentId: 'gate1',
      actor: { id: 'u' },
    });
    expect(
      await serialize({
        type: 'APPROVAL_DENIED',
        componentId: 'gate1',
        actor: { id: 'u' },
        reason: 'no',
      }),
    ).toEqual({
      kind: 'approval',
      decision: 'denied',
      componentId: 'gate1',
      actor: { id: 'u' },
      reason: 'no',
    });
  });
});
