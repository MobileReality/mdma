import { useRef, useEffect, useCallback, useState } from 'react';
import { useAgent } from './agent/use-agent.js';
import { useAgentActionLog } from './agent/use-agent-action-log.js';
import { AgentMessage } from './agent/AgentMessage.js';
import { AgentSettings } from './agent/AgentSettings.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import { ChatInput } from './chat/ChatInput.js';
import type { AssistantTurn, AgentDisplayTurn } from './agent/types.js';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Scripted conversation for the auto-play demo (each entry is one user message).
const DEMO_SCRIPT = [
  'hi',
  'generate sample form',
  'sample chart',
  'and table',
  'whats Product Name',
  'ok could make chart from this table',
  'line pls',
  // Closes on the `custom` component: a host-registered `graph-3d` variant the
  // agent can only author because it is in the prompt's custom-component
  // catalog (see GRAPH_3D_CATALOG_ENTRY). Bars are clickable — the selection
  // dispatches into the action log like any other MDMA interaction.
  'pls generate sample 3D graph',
];

/**
 * Serialize the conversation to a raw transcript: the user's messages and the
 * agent's PURE responses (conversational text + the generate_mdma document),
 * with only `You:` / `Agent:` to mark who spoke — no other added labels.
 */
function buildRawTranscript(turns: AgentDisplayTurn[]): string {
  return turns
    .map((turn) => {
      if (turn.role === 'user') return turn.hidden ? '' : `You:\n${turn.content}`;
      const body = (turn as AssistantTurn).blocks
        .map((b) => (b.type === 'tool_use' ? b.document : b.content))
        .filter(Boolean)
        .join('\n\n');
      return `Agent:\n${body}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export function AgentChatView() {
  const {
    turns,
    isGenerating,
    error,
    input,
    setInput,
    config,
    updateConfig,
    send,
    sendText,
    stop,
    clear,
    inputRef,
  } = useAgent({ useAuthorSubAgent: true });

  const { events, isOpen: logOpen, setIsOpen: setLogOpen, clearEvents } = useAgentActionLog(turns);

  const [copiedRaw, setCopiedRaw] = useState(false);
  const handleCopyRaw = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildRawTranscript(turns));
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }, [turns]);

  // ── Auto-play demo ──────────────────────────────────────────────────────────
  // Replays a scripted conversation through the real agent: types each message,
  // sends it, waits for the full response, then the next. For demo recordings.
  const [isPlaying, setIsPlaying] = useState(false);
  const playingRef = useRef(false);
  const handlePlayDemo = useCallback(async () => {
    if (playingRef.current) {
      // already running → stop
      playingRef.current = false;
      setIsPlaying(false);
      return;
    }
    playingRef.current = true;
    setIsPlaying(true);
    clear();
    clearEvents();
    await sleep(500);

    for (const msg of DEMO_SCRIPT) {
      if (!playingRef.current) break;
      // Typewriter the message into the input for a natural look.
      for (let k = 1; k <= msg.length; k++) {
        if (!playingRef.current) break;
        setInput(msg.slice(0, k));
        await sleep(28);
      }
      await sleep(350);
      if (!playingRef.current) break;
      setInput('');
      await sendText(msg); // renders the user bubble + awaits the agent's reply
      await sleep(1100); // beat between turns
    }

    playingRef.current = false;
    setIsPlaying(false);
  }, [clear, clearEvents, sendText, setInput]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(turns.length);

  useEffect(() => {
    if (turns.length > prevCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevCountRef.current = turns.length;
  }, [turns]);

  const handleClear = useCallback(() => {
    clear();
    clearEvents();
  }, [clear, clearEvents]);

  return (
    <div className={`chat-layout${logOpen ? ' chat-layout--with-log' : ''}`}>
      <div className="chat-main">
        <AgentSettings config={config} onUpdate={updateConfig} />

        <div className="chat-messages">
          {turns.length === 0 && (
            <div className="chat-empty">
              <p className="chat-empty-title">MDMA Agent</p>
              <p className="chat-empty-hint">
                Describe the interactive document you need. The agent will think through it, then
                call <code>generate_mdma</code> to render it for you.
              </p>
            </div>
          )}

          {turns.map((turn) => (
            <AgentMessage key={turn.id} turn={turn} />
          ))}

          {error && <div className="chat-error">{error}</div>}

          <div ref={chatEndRef} />
        </div>

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={send}
          onStop={stop}
          onClear={handleClear}
          isGenerating={isGenerating}
          hasMessages={turns.length > 0}
          inputRef={inputRef}
          onCopyRaw={handleCopyRaw}
          copiedRaw={copiedRaw}
          onPlayDemo={handlePlayDemo}
          isPlaying={isPlaying}
        />
      </div>

      <ChatActionLog events={events} isOpen={logOpen} onToggle={() => setLogOpen((v) => !v)} />
    </div>
  );
}
