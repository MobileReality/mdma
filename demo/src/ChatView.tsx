import { useRef, useEffect } from 'react';
import { useChat, type UseChatOptions } from './chat/use-chat.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import type { MdmaRenderCustomizations } from '@mdma/renderer-react';
import type { ZodType } from 'zod';

export interface MdmaCustomizations extends MdmaRenderCustomizations {
  /** Zod schemas for custom (non-built-in) component types. */
  schemas?: Map<string, ZodType>;
}

export interface ChatViewProps {
  /** All MDMA customizations bundled in a single prop. */
  customizations?: MdmaCustomizations;
}

export function ChatView({ customizations }: ChatViewProps = {}) {
  const chatOptions: UseChatOptions | undefined = customizations?.schemas
    ? { parserOptions: { customSchemas: customizations.schemas } }
    : undefined;
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
            customizations={customizations}
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
