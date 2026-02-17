import { useRef, useEffect } from 'react';
import { useChat } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';

export function ChatView() {
  const {
    config,
    messages,
    input,
    setInput,
    isGenerating,
    error,
    inputRef,
    updateConfig,
    applyPreset,
    send,
    stop,
    clear,
  } = useChat();

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className="chat-layout">
      <ChatSettings
        config={config}
        onUpdate={updateConfig}
        onPreset={applyPreset}
      />

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">MDMA Chat</p>
            <p className="chat-empty-hint">
              Describe an interactive document and the AI will generate it as a live, interactive MDMA form.
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isStreaming={isGenerating && msg.id === lastMsgId}
          />
        ))}

        {error && <div className="chat-error">{error}</div>}

        <div ref={chatEndRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={stop}
        onClear={clear}
        isGenerating={isGenerating}
        hasMessages={messages.length > 0}
        inputRef={inputRef}
      />
    </div>
  );
}
