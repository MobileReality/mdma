import { useEffect, useRef } from 'react';
import { SUGGESTIONS } from './agent.js';
import { AuditPanel } from './audit/AuditPanel.js';
import { ChatInput } from './chat/ChatInput.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { useChat } from './chat/use-chat.js';

export function App() {
  const { turns, isStreaming, error, send, stop, clear } = useChat();
  const bottom = useRef<HTMLDivElement>(null);
  const lastContent = turns.at(-1)?.content;

  useEffect(() => {
    if (lastContent === undefined) return;
    bottom.current?.scrollIntoView({ block: 'end' });
  }, [lastContent]);

  return (
    <div className="app">
      <main className="chat">
        <header className="chat__header">
          <h1>MDMA — Electron</h1>
          <button type="button" className="chat__clear" onClick={clear} disabled={!turns.length}>
            Clear
          </button>
        </header>

        <div className="chat__scroll">
          {turns.length === 0 && (
            <div className="suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="suggestions__item"
                  onClick={() => void send(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {turns.map((turn) => (
            <ChatMessage key={turn.id} turn={turn} />
          ))}

          {error && <p className="chat__error">{error}</p>}
          <div ref={bottom} />
        </div>

        <ChatInput isStreaming={isStreaming} onSend={(text) => void send(text)} onStop={stop} />
      </main>

      <AuditPanel />
    </div>
  );
}
