import { useRef, useEffect, useCallback } from 'react';
import { useAgent } from './agent/use-agent.js';
import { useAgentActionLog } from './agent/use-agent-action-log.js';
import { AgentMessage } from './agent/AgentMessage.js';
import { AgentSettings } from './agent/AgentSettings.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import { ChatInput } from './chat/ChatInput.js';

export function AgentChatView() {
  const { turns, isGenerating, error, input, setInput, config, updateConfig, send, stop, clear, inputRef } =
    useAgent();

  const { events, isOpen: logOpen, setIsOpen: setLogOpen, clearEvents } = useAgentActionLog(turns);

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
                Describe the interactive document you need. The agent will think through it, then call{' '}
                <code>generate_mdma</code> to render it for you.
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
        />
      </div>

      <ChatActionLog
        events={events}
        isOpen={logOpen}
        onToggle={() => setLogOpen((v) => !v)}
      />
    </div>
  );
}
