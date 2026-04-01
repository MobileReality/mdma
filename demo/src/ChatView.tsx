import { useRef, useEffect, useCallback } from 'react';
import { useChat, type UseChatOptions } from './chat/use-chat.js';
import { useChatActionLog } from './chat/use-chat-action-log.js';
import { ChatSettings } from './chat/ChatSettings.js';
import { ChatMessage } from './chat/ChatMessage.js';
import { ChatInput } from './chat/ChatInput.js';
import { ChatActionLog } from './chat/ChatActionLog.js';
import { exampleFlows } from './example-flows.js';
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

export function ChatView({
  customizations,
  systemPrompt,
  userSuffix,
  storageKey,
  editable,
}: ChatViewProps = {}) {
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
    startFlow,
    advanceFlow,
  } = useChat(chatOptions);

  const advanceFlowRef = useRef(advanceFlow);
  advanceFlowRef.current = advanceFlow;

  // Subscribe to ACTION_TRIGGERED events on assistant message stores to advance the flow
  const subscribedStores = useRef(new Set<import('@mobile-reality/mdma-runtime').DocumentStore>());

  useEffect(() => {
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !subscribedStores.current.has(msg.store)) {
        subscribedStores.current.add(msg.store);
        msg.store.getEventBus().on('ACTION_TRIGGERED', () => {
          // Small delay so the user sees the interaction before the next step loads
          setTimeout(() => advanceFlowRef.current(), 500);
        });
      }
    }
  }, [messages]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      subscribedStores.current.clear();
    };
  }, []);

  const handleLoadFlow = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value;
      if (!key) return;
      const flow = exampleFlows[key];
      if (flow) startFlow(flow.steps, flow.customPrompt);
      e.target.value = '';
    },
    [startFlow],
  );

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
    subscribedStores.current.clear();
  }, [clear, clearEvents]);

  const lastMsgId = messages[messages.length - 1]?.id;

  return (
    <div className={`chat-layout ${isOpen ? 'chat-layout--with-log' : ''}`}>
      <div className="chat-main">
        <ChatSettings config={config} onUpdate={updateConfig} onPreset={applyPreset} />

        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-empty">
              <p className="chat-empty-title">MDMA Chat</p>
              <p className="chat-empty-hint">
                Describe an interactive document and the AI will generate it, or try an example
                flow:
              </p>
              <select
                defaultValue=""
                onChange={handleLoadFlow}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  background: '#fff',
                  color: '#374151',
                  fontSize: '14px',
                  cursor: 'pointer',
                  marginTop: '8px',
                  minWidth: '220px',
                }}
              >
                <option value="" disabled>
                  Load an example flow…
                </option>
                {Object.entries(exampleFlows).map(([key, flow]) => (
                  <option key={key} value={key}>
                    {flow.label}
                  </option>
                ))}
              </select>
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

      <ChatActionLog events={events} isOpen={isOpen} onToggle={() => setIsOpen((prev) => !prev)} />
    </div>
  );
}
