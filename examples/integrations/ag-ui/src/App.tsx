import { useEffect, useMemo, useRef, useState } from 'react';
import { HttpAgent } from '@ag-ui/client';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { useMdmaAgentStream } from '@mobile-reality/mdma-agui/react';
import { parseMdma, type AguiAgent, type MdmaMessageState } from '@mobile-reality/mdma-agui';
import './styles.css';

const BE = 'http://localhost:8787';

// A scripted conversation you can replay hands-free with ▶ Play demo. Each line is sent as a user
// turn once the previous run finishes. Play reloads with ?demo=1 so every run starts from a clean
// thread — the agent is a live LLM, so replays are close but not byte-identical.
const DEMO_SCRIPT = [
  'hi',
  'bug report pls',
  'what do you need from me?',
  "ok so I opened the app, went through onboarding, and tapped into the Notifications screen — instead of showing the notifications list it closed and dropped me back to the home screen. I expected the list to load. This is on the dev environment. I'm not really sure how bad it is.",
  'how big is it?',
  'ok set high',
];

type Turn = { kind: 'user'; text: string } | { kind: 'assistant'; messageId: string };

function primaryComponentId(doc: MdmaMessageState): string | null {
  for (const c of (doc.ast?.children ?? []) as Array<{ type?: string; component?: { id?: string; type?: string } }>) {
    if (c.type === 'mdmaBlock' && c.component && c.component.type !== 'thinking') return c.component.id ?? null;
  }
  return null;
}

function Prose({ text }: { text: string }) {
  const [doc, setDoc] = useState<Awaited<ReturnType<typeof parseMdma>> | null>(null);
  useEffect(() => {
    let alive = true;
    parseMdma(text)
      .then((r) => alive && setDoc(r))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [text]);
  return doc ? (
    <MdmaDocument ast={doc.ast} store={doc.store} theme="dark" />
  ) : (
    <span className="prose">{text}</span>
  );
}

export function App() {
  const agent = useMemo(() => new HttpAgent({ url: `${BE}/agent` }), []);
  const [timeline, setTimeline] = useState<Turn[]>([]);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ live: boolean; model: string } | null>(null);
  const [playing, setPlaying] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const autoplayed = useRef(false);

  const appendAssistant = (id: string) =>
    setTimeline((t) =>
      t.some((x) => x.kind === 'assistant' && x.messageId === id) ? t : [...t, { kind: 'assistant', messageId: id }],
    );

  const { documents, interrupts, state, activity } = useMdmaAgentStream(agent as unknown as AguiAgent, {
    onDocument: (m) => appendAssistant(m.messageId),
    onAction: (action, message) => {
      if (action.type !== 'ACTION_TRIGGERED') return;
      const values = message.store.getComponentState(action.componentId)?.values ?? {};
      agent.addMessage({
        id: crypto.randomUUID(),
        role: 'user',
        content: JSON.stringify({ kind: 'action', componentId: action.componentId, actionId: action.actionId, values }),
      });
      agent.runAgent().catch((e) => console.warn('runAgent failed', e));
      return false; // host took over resumption
    },
  });
  const parked = interrupts.length > 0;
  const hasState = Object.keys(state).length > 0;

  const canvas = useMemo(() => {
    const byId = new Map<string, MdmaMessageState>();
    for (const doc of documents) byId.set(primaryComponentId(doc) ?? doc.messageId, doc);
    return [...byId.entries()];
  }, [documents]);

  useEffect(() => {
    const sub = agent.subscribe({
      onTextMessageStartEvent: ({ event }) => appendAssistant(event.messageId),
      onTextMessageContentEvent: ({ event, textMessageBuffer }) =>
        setTexts((m) => ({ ...m, [event.messageId]: textMessageBuffer })),
      onTextMessageEndEvent: ({ event, textMessageBuffer }) =>
        setTexts((m) => ({ ...m, [event.messageId]: textMessageBuffer })),
    });
    return () => sub.unsubscribe();
  }, [agent]);

  useEffect(() => {
    fetch(`${BE}/health`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo(null));
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on any transcript change
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [timeline, documents, texts]);

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setTimeline((t) => [...t, { kind: 'user', text }]);
    agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });
    setBusy(true);
    agent.runAgent()
      .catch((e) => console.warn('runAgent failed', e))
      .finally(() => setBusy(false));
  };

  // Replay DEMO_SCRIPT hands-free: send each line, wait for its run to finish, pause, then the next.
  const runScript = async () => {
    setPlaying(true);
    try {
      for (const text of DEMO_SCRIPT) {
        setTimeline((t) => [...t, { kind: 'user', text }]);
        agent.addMessage({ id: crypto.randomUUID(), role: 'user', content: text });
        await agent.runAgent().catch((e) => console.warn('runAgent failed', e));
        await new Promise((r) => setTimeout(r, 700));
      }
    } finally {
      setPlaying(false);
    }
  };

  // Play reloads with ?demo=1 so the replay always starts from a fresh thread / clean panel.
  const playDemo = () => {
    const u = new URL(window.location.href);
    u.searchParams.set('demo', '1');
    window.history.replaceState(null, '', u);
    window.location.reload();
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once when the backend reports live
  useEffect(() => {
    if (autoplayed.current || !info?.live) return;
    if (new URLSearchParams(window.location.search).get('demo')) {
      autoplayed.current = true;
      runScript();
    }
  }, [info]);

  return (
    <div className="page chat">
      <div className="chat-main">
        <header>
          <div className="header-row">
            <h1>MDMA agent — live</h1>
            <button
              type="button"
              className="play"
              onClick={playDemo}
              disabled={!info?.live || playing}
              title="Replay a scripted bug-report conversation against the live agent"
            >
              {playing ? '▶ Playing…' : '▶ Play demo'}
            </button>
          </div>
          <p>
            Real <code>@ag-ui/client</code> HttpAgent → AG-UI backend → LLM → MDMA. Ask for a form,
            an approval gate, a table, or a checklist.
          </p>
          <div className="status">
            {info ? (
              info.live ? (
                <>
                  <span className="dot done" /> live · <code>{info.model}</code>
                </>
              ) : (
                <>
                  <span className="dot running" /> no key — set <code>OPENROUTER_API_KEY</code> in the
                  backend <code>.env</code>
                </>
              )
            ) : (
              <>
                <span className="dot running" /> backend unreachable — run <code>pnpm backend</code> in{' '}
                <code>examples/integrations/ag-ui</code>
              </>
            )}
          </div>
        </header>

        {parked && (
          <div className="interrupt-banner">
            ⏸ Run parked on {interrupts.length} interrupt{interrupts.length > 1 ? 's' : ''}:{' '}
            {interrupts.map((i) => (
              <code key={i.id}>{i.id}</code>
            ))}
            <span className="hint"> — approve or deny the gate below to resume the run in place.</span>
          </div>
        )}

        <div className="transcript" ref={scroller}>
          {timeline.length === 0 && (
            <p className="empty">Say hi, try "make me a signup form", or hit ▶ Play demo above.</p>
          )}
          {timeline.map((turn, i) => {
            if (turn.kind === 'user') {
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only timeline
              return (
                <div key={i} className="bubble user">
                  {turn.text}
                </div>
              );
            }
            const doc = documents.find((d) => d.messageId === turn.messageId);
            if (doc) {
              const id = primaryComponentId(doc) ?? 'component';
              // biome-ignore lint/suspicious/noArrayIndexKey: append-only timeline
              return (
                <div key={i} className="bubble assistant chip">
                  📄 rendered <code>{id}</code> — see the panel →
                </div>
              );
            }
            const raw = texts[turn.messageId];
            // biome-ignore lint/suspicious/noArrayIndexKey: append-only timeline
            return (
              <div key={i} className="bubble assistant">
                {raw ? <Prose text={raw} /> : <em>…</em>}
              </div>
            );
          })}
        </div>

        <div className="composer">
          <input
            value={input}
            placeholder={
              playing
                ? 'Playing the scripted demo…'
                : parked
                  ? 'Answer the approval gate above to continue…'
                  : 'Message the agent…'
            }
            disabled={parked || playing}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button type="button" onClick={send} disabled={busy || parked || playing || !input.trim()}>
            Send
          </button>
        </div>
      </div>

      <section className="canvas">
        <h2>📄 Live components</h2>
        <p className="hint">
          Rendered forms / gates / tables, one card per component id. Updating a component replaces
          its card here instead of stacking copies in the chat.
        </p>
        {canvas.length === 0 && (
          <p className="emptyState">Ask for a form, an approval gate, a table, or a checklist.</p>
        )}
        {canvas.map(([id, doc]) => (
          <article key={id} className="canvas-doc">
            <div className="canvas-meta">
              <code>{id}</code>
            </div>
            <MdmaDocument ast={doc.ast} store={doc.store} theme="dark" />
          </article>
        ))}
      </section>

      <aside className="sidebar">
        <section className="state-panel">
          <h2>🧠 Shared state</h2>
          <p className="hint">
            The agent's AG-UI state. <code>profile</code> = what it remembers about you;
            other keys are form values. Forms pre-fill from matching component ids.
          </p>
          <pre className={hasState ? 'filled' : 'emptyState'}>{JSON.stringify(state, null, 2)}</pre>
        </section>

        <section className="activity-panel">
          <h2>⚙️ Activity feed</h2>
          <p className="hint">
            Tool calls / steps / reasoning — the agent's actions, kept separate from the
            rendered documents.
          </p>
          {activity.length === 0 && <p className="emptyState">No activity yet.</p>}
          <ul>
            {activity.map((a) => (
              <li key={a.id} className={`act act-${a.kind} ${a.status}`}>
                <span className="act-head">
                  <span className="act-kind">{a.kind}</span>
                  <strong>{a.label}</strong>
                  <span className={`dot ${a.status}`}>{a.status === 'done' ? '✓' : '…'}</span>
                </span>
                {a.detail && <code className="act-detail">{a.detail}</code>}
              </li>
            ))}
          </ul>
        </section>
      </aside>
    </div>
  );
}
