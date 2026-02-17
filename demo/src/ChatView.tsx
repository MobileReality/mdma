import { useRef, useEffect, type ComponentType } from 'react';
import { useChat, type UseChatOptions } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import type { MdmaBlockRendererProps } from '@mdma/renderer-react';
import type { RemarkMdmaOptions } from '@mdma/parser';

export interface ChatViewProps {
  /** Custom renderers to override or extend the built-in MDMA component renderers. */
  renderers?: Record<string, ComponentType<MdmaBlockRendererProps>>;
  /** Custom parser options (e.g. custom component schemas for new types). */
  parserOptions?: RemarkMdmaOptions;
}

export function ChatView({ renderers, parserOptions }: ChatViewProps = {}) {
  const chatOptions: UseChatOptions | undefined = parserOptions ? { parserOptions } : undefined;
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
  } = useChat(chatOptions);

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
            renderers={renderers}
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
