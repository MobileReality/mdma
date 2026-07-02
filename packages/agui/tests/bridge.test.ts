import { describe, it, expect } from 'vitest';
import { createMdmaAgentBridge, type MdmaMessageState } from '../src/bridge.js';
import { parseMdma } from '../src/parse.js';
import type {
  AguiAgent,
  AguiMessage,
  AguiSubscriber,
  AguiSubscription,
} from '../src/types.js';

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

/** Minimal in-memory AG-UI agent for exercising the bridge. */
class FakeAgent implements AguiAgent {
  subscriber: AguiSubscriber | null = null;
  added: AguiMessage[] = [];
  runs = 0;

  subscribe(subscriber: AguiSubscriber): AguiSubscription {
    this.subscriber = subscriber;
    return { unsubscribe: () => (this.subscriber = null) };
  }
  async runAgent(): Promise<unknown> {
    this.runs += 1;
    return undefined;
  }
  addMessage(message: AguiMessage): void {
    this.added.push(message);
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
}

function astBlockTypes(state: MdmaMessageState | undefined): string[] {
  if (!state) return [];
  return state.ast.children
    .filter((c): c is { type: 'mdmaBlock'; component: { type: string } } =>
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
    const lagging = APPROVAL_DOC.slice(0, APPROVAL_DOC.indexOf('approval-gate') + 'approval-gat'.length);
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

  it('lets the host take over resumption when onAction returns false', async () => {
    const agent = new FakeAgent();
    const bridge = createMdmaAgentBridge(agent, {
      throttleMs: 0,
      onAction: () => false, // e.g. host resolves an AG-UI interrupt itself
    });

    agent.emitContent('m1', APPROVAL_DOC);
    await bridge.flush();

    const store = bridge.documents.get('m1')!.store;
    store.dispatch({ type: 'APPROVAL_DENIED', componentId: 'gate1', actor: { id: 'u' }, reason: 'no' });
    await Promise.resolve();

    expect(agent.runs).toBe(0);
    expect(agent.added).toHaveLength(0);
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
