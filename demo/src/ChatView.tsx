import { useRef, useEffect, useCallback } from 'react';
import { useChat, type UseChatOptions } from './chat/use-chat.js';
import { useChatActionLog } from './chat/use-chat-action-log.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import type { MdmaRenderCustomizations } from '@mobile-reality/mdma-renderer-react';
import type { ZodType } from 'zod';

export interface MdmaCustomizations extends MdmaRenderCustomizations {
  /** Zod schemas for custom (non-built-in) component types. */
  schemas?: Map<string, ZodType>;
}

export interface ChatViewProps {
  /** All MDMA customizations bundled in a single prop. */
  customizations?: MdmaCustomizations;
  /** Custom system prompt. Defaults to the full MDMA author prompt. */
  systemPrompt?: string;
  /** Suffix appended to user messages. `null` = no suffix. */
  userSuffix?: string | null;
  /** localStorage key suffix for separate chat histories. */
  storageKey?: string;
  /** When true, assistant messages can be edited via the Source view. */
  editable?: boolean;
}

export function ChatView({ customizations, systemPrompt, userSuffix, storageKey, editable }: ChatViewProps = {}) {
  const chatOptions: UseChatOptions = {
    ...(customizations?.schemas && { parserOptions: { customSchemas: customizations.schemas } }),
    ...(systemPrompt !== undefined && { systemPrompt }),
    ...(userSuffix !== undefined && { userSuffix }),
    ...(storageKey !== undefined && { storageKey }),
  };
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
    updateMessage,
  } = useChat(chatOptions);

  const { events, isOpen, setIsOpen, clearEvents } = useChatActionLog(messages);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const prevMsgCountRef = useRef(messages.length);

  // Auto-scroll only when new messages are added (not on content edits to existing ones)
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMsgCountRef.current = messages.length;
  }, [messages]);

  const handleClear = useCallback(() => {
    clear();
    clearEvents();
  }, [clear, clearEvents]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className={`chat-layout ${isOpen ? 'chat-layout--with-log' : ''}`}>
      <div className="chat-main">
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
              onEditContent={editable ? updateMessage : undefined}
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
          onClear={handleClear}
          isGenerating={isGenerating}
          hasMessages={messages.length > 0}
          inputRef={inputRef}
        />
      </div>

      <ChatActionLog
        events={events}
        isOpen={isOpen}
        onToggle={() => setIsOpen((prev) => !prev)}
      />
    </div>
  );
}
