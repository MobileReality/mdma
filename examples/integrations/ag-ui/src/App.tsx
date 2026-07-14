import { HttpAgent } from '@ag-ui/client';
import type { AguiAgent } from '@mobile-reality/mdma-agui';
import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type BackendInfo, Header } from './components/Header';
import { LiveComponents } from './components/LiveComponents';
import { Sidebar } from './components/Sidebar';
import { Transcript, type Turn } from './components/Transcript';
import { startDemo, useDemoPlayback } from './demo';
import './styles.css';

const BE = 'http://localhost:8787';

export function App() {
  const agent = useMemo(() => new HttpAgent({ url: `${BE}/agent` }), []);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<BackendInfo | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const appendAssistant = useCallback((messageId: string) => {
    setTurns((t) =>
      t.some((x) => x.kind === 'assistant' && x.messageId === messageId)
        ? t
        : [...t, { id: messageId, kind: 'assistant', messageId }],
    );
  }, []);

  const { documents, interrupts, state, activity } = useMdmaAgentStream(
    agent as unknown as AguiAgent,
    {
      onDocument: (m) => appendAssistant(m.messageId),
      onAction: (action, message) => {
        if (action.type !== 'ACTION_TRIGGERED') return;
        // A form submit carries no values of its own — MDMA is headless, so read them out of the
        // store and send them along, otherwise the agent gets an empty submission.
        const values = message.store.getComponentState(action.componentId)?.values ?? {};
        agent.addMessage({
          id: crypto.randomUUID(),
          role: 'user',
          content: JSON.stringify({
            kind: 'action',
            componentId: action.componentId,
            actionId: action.actionId,
            values,
          }),
        });
        agent.runAgent().catch((e) => console.warn('runAgent failed', e));
        return false; // host took over resumption
      },
    },
  );

  const parked = interrupts.length > 0;

  /** Send one user turn; resolves when its run has finished. */
  const sendTurn = useCallback(
    async (text: string) => {
      setTurns((t) => [...t, { id: crypto.randomUUID(), kind: 'user', text }]);
      agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });
      setBusy(true);
      try {
        await agent.runAgent();
      } catch (e) {
        console.warn('runAgent failed', e);
      } finally {
        setBusy(false);
      }
    },
    [agent],
  );

  const playing = useDemoPlayback(Boolean(info?.live), sendTurn);

  const submit = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    sendTurn(text);
  };

  // The bridge surfaces documents; plain prose arrives on the raw text stream, so tap that too.
  useEffect(() => {
    const sub = agent.subscribe({
      onTextMessageStartEvent: ({ event }) => appendAssistant(event.messageId),
      onTextMessageContentEvent: ({ event, textMessageBuffer }) =>
        setTexts((m) => ({ ...m, [event.messageId]: textMessageBuffer })),
      onTextMessageEndEvent: ({ event, textMessageBuffer }) =>
        setTexts((m) => ({ ...m, [event.messageId]: textMessageBuffer })),
    });
    return () => sub.unsubscribe();
  }, [agent, appendAssistant]);

  useEffect(() => {
    fetch(`${BE}/health`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on any transcript change
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [turns, documents, texts]);

  const placeholder = playing
    ? 'Playing the scripted demo…'
    : parked
      ? 'Answer the approval gate above to continue…'
      : 'Message the agent…';

  return (
    <div className="page chat">
      <div className="chat-main">
        <Header info={info} playing={playing} onPlay={startDemo} />

        {parked && (
          <div className="interrupt-banner">
            ⏸ Run parked on {interrupts.length} interrupt{interrupts.length > 1 ? 's' : ''}:{' '}
            {interrupts.map((i) => (
              <code key={i.id}>{i.id}</code>
            ))}
            <span className="hint">
              {' '}
              — approve or deny the gate below to resume the run in place.
            </span>
          </div>
        )}

        <Transcript turns={turns} documents={documents} texts={texts} scrollRef={scroller} />

        <div className="composer">
          <input
            value={input}
            placeholder={placeholder}
            disabled={parked || playing}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy || parked || playing || !input.trim()}
          >
            Send
          </button>
        </div>
      </div>

      <LiveComponents documents={documents} />
      <Sidebar state={state} activity={activity} />
    </div>
  );
}
