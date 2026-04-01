import { useState, useRef, useCallback, useEffect } from 'react';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { streamChatCompletion, chatCompletion } from '../lib/llm-client.js';
import { detectProvider } from '../lib/api-keys.js';
import { PROVIDER_PRESETS } from '../lib/llm-client.js';
import { parseMarkdown } from '../lib/parse-markdown.js';
import { PreviewMessage } from './PreviewMessage.js';
import { ChatInput } from './ui/ChatInput.js';
import type { LlmConfig, ChatMessage } from '../lib/llm-client.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

interface PreviewTabProps {
  customPrompt: string;
  llmConfig: LlmConfig;
  llmOverride: Partial<LlmConfig>;
  onOverrideChange: (override: Partial<LlmConfig>) => void;
  chatConfig: LlmConfig;
}

interface PreviewMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  ast: MdmaRoot | null;
  store: DocumentStore | null;
}

interface SavedMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

const PARSE_INTERVAL = 200;
const STORAGE_KEY = 'mdma-builder-preview-messages';

function loadSavedMessages(): SavedMsg[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(messages: PreviewMsg[]) {
  const serializable: SavedMsg[] = messages
    .filter((m) => m.content)
    .map(({ id, role, content }) => ({ id, role, content }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

export function PreviewTab({
  customPrompt,
  llmConfig,
  llmOverride,
  onOverrideChange,
  chatConfig,
}: PreviewTabProps) {
  const [showSettings, setShowSettings] = useState(false);
  const activeProvider = detectProvider(llmConfig.baseUrl);
  const activePreset = activeProvider ? PROVIDER_PRESETS[activeProvider] : null;
  const hasOverride = !!(llmOverride.model || llmOverride.baseUrl || llmOverride.apiKey);
  const [messages, setMessages] = useState<PreviewMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Restore saved messages on mount
  useEffect(() => {
    const saved = loadSavedMessages();
    if (saved.length === 0) {
      setRestored(true);
      return;
    }
    const maxId = Math.max(...saved.map((m) => m.id));
    msgIdRef.current = maxId;

    // Reparse all assistant messages to restore AST/store
    const restored: PreviewMsg[] = saved.map((m) => ({
      ...m,
      ast: null,
      store: null,
    }));
    setMessages(restored);

    (async () => {
      for (const msg of saved) {
        if (msg.role === 'assistant' && msg.content) {
          try {
            const { ast, store } = await parseMarkdown(msg.content);
            setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, ast, store } : m)));
          } catch {
            // parse errors on restore are fine
          }
        }
      }
      setRestored(true);
    })();
  }, []);

  // Save messages whenever they change (skip during restore)
  useEffect(() => {
    if (restored && !isGenerating) {
      saveMessages(messages);
    }
  }, [messages, restored, isGenerating]);

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const reparseMessage = useCallback(async (content: string, msgId: number) => {
    try {
      const existing = messagesRef.current.find((m) => m.id === msgId)?.store ?? undefined;
      const { ast, store } = await parseMarkdown(content, existing);
      setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, ast, store } : m)));
    } catch {
      // parse errors during streaming are fine
    }
  }, []);

  const isGeneratingRef = useRef(false);

  const sendText = useCallback(
    async (text: string) => {
      if (!text || isGeneratingRef.current) return;

      setError(null);
      setIsGenerating(true);
      isGeneratingRef.current = true;

      const userMsg: PreviewMsg = {
        id: ++msgIdRef.current,
        role: 'user',
        content: text,
        ast: null,
        store: null,
      };
      const assistantMsg: PreviewMsg = {
        id: ++msgIdRef.current,
        role: 'assistant',
        content: '',
        ast: null,
        store: null,
      };

      const prevMessages = messagesRef.current;
      setMessages([...prevMessages, userMsg, assistantMsg]);
      scrollToBottom();

      const systemPrompt = buildSystemPrompt({ customPrompt: customPrompt || undefined });
      const history: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...prevMessages.map((m) => ({ role: m.role, content: m.content })),
        {
          role: 'user' as const,
          content: `${text}\n\nRespond with an MDMA Markdown document. Do not wrap it in code fences.`,
        },
      ];

      abortRef.current = new AbortController();
      const asstId = assistantMsg.id;
      let lastParseTime = 0;

      try {
        let fullOutput = '';
        try {
          for await (const chunk of streamChatCompletion(
            llmConfig,
            history,
            abortRef.current.signal,
          )) {
            fullOutput += chunk;
            const snapshot = fullOutput;
            setMessages((prev) =>
              prev.map((m) => (m.id === asstId ? { ...m, content: snapshot } : m)),
            );
            const now = Date.now();
            if (now - lastParseTime >= PARSE_INTERVAL) {
              lastParseTime = now;
              reparseMessage(snapshot, asstId);
            }
          }
        } catch (streamErr) {
          if (abortRef.current.signal.aborted) throw streamErr;
          fullOutput = await chatCompletion(llmConfig, history, abortRef.current.signal);
          setMessages((prev) =>
            prev.map((m) => (m.id === asstId ? { ...m, content: fullOutput } : m)),
          );
        }
        await reparseMessage(fullOutput, asstId);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        setIsGenerating(false);
        isGeneratingRef.current = false;
        abortRef.current = null;
      }
    },
    [customPrompt, llmConfig, reparseMessage, scrollToBottom],
  );

  const sendTextRef = useRef(sendText);
  sendTextRef.current = sendText;

  const send = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendTextRef.current(text);
  }, [input]);

  // Subscribe to ACTION_TRIGGERED events from all assistant message stores
  const subscribedStores = useRef(new Set<DocumentStore>());

  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !subscribedStores.current.has(msg.store)) {
        subscribedStores.current.add(msg.store);
        const store = msg.store;
        const unsub = store.getEventBus().on('ACTION_TRIGGERED', (event) => {
          const compState = store.getComponentState(event.componentId);
          if (!compState) return;

          const values = compState.values;
          const entries = Object.entries(values);
          if (entries.length === 0) return;

          const summary = entries.map(([key, val]) => `${key}: ${val}`).join('\n');

          sendTextRef.current(`[Form submitted: ${event.componentId}]\n${summary}`);
        });
        unsubscribes.push(unsub);
      }
    }

    // Don't unsubscribe — stores persist across renders and we track them in the Set
    // Only clean up on unmount
    return () => {};
  }, [messages]);

  // Clean up subscribed stores tracking on unmount
  useEffect(() => {
    return () => {
      subscribedStores.current.clear();
    };
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    msgIdRef.current = 0;
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasKey = llmConfig.apiKey.length > 0 || llmConfig.baseUrl.includes('localhost');
  const disabled = !hasKey || !customPrompt;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex gap-2 items-center pb-2 border-b border-border-light">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Preview Chat</h3>
        {customPrompt ? (
          <span className="text-[11px] text-success">customPrompt loaded</span>
        ) : (
          <span className="text-[11px] text-warning">Generate a prompt first</span>
        )}
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className="border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover"
        >
          {showSettings ? 'Hide Settings' : 'Settings'}
        </button>
        <span className="text-[11px] text-text-muted">
          {activePreset?.label || 'Custom'} / {llmConfig.model}
          {hasOverride && ' (override)'}
        </span>
        <div className="flex-1" />
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clear}
            className="border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover"
          >
            Clear
          </button>
        )}
      </div>

      {showSettings && (
        <div className="p-3 border border-border rounded-lg bg-surface-1 mb-2 flex flex-col gap-2.5">
          <span className="text-xs text-text-secondary font-medium">
            Preview LLM Override
            <span className="text-text-muted font-normal ml-1">
              (leave empty to use Chat settings)
            </span>
          </span>
          <div className="flex gap-2">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">Model</span>
              <input
                placeholder={chatConfig.model}
                value={llmOverride.model ?? ''}
                onChange={(e) => onOverrideChange({ ...llmOverride, model: e.target.value })}
                className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">API Key</span>
              <input
                placeholder={chatConfig.apiKey ? '••••••••' : 'Same as Chat'}
                type="password"
                value={llmOverride.apiKey ?? ''}
                onChange={(e) => onOverrideChange({ ...llmOverride, apiKey: e.target.value })}
                className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex-[2] flex flex-col gap-1">
              <span className="text-[11px] text-text-secondary">Base URL</span>
              <input
                placeholder={chatConfig.baseUrl}
                value={llmOverride.baseUrl ?? ''}
                onChange={(e) => onOverrideChange({ ...llmOverride, baseUrl: e.target.value })}
                className="px-2 py-1.5 border border-border rounded bg-surface-2 text-text-primary text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
          {hasOverride && (
            <button
              type="button"
              onClick={() => onOverrideChange({})}
              className="self-start border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover"
            >
              Reset to Chat settings
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-text-muted text-sm text-center py-10 px-5">
            {customPrompt ? (
              <>
                Test your generated prompt here. Ask the LLM to create an interactive document and
                see MDMA components render live.
              </>
            ) : (
              <>
                Switch to the <strong>Chat</strong> tab and generate a prompt first, then come back
                here to test it.
              </>
            )}
          </div>
        )}
        {messages.map((msg) => (
          <PreviewMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            ast={msg.ast}
            store={msg.store}
          />
        ))}
        {error && <div className="text-xs text-error px-2">{error}</div>}
        <div ref={chatEndRef} />
      </div>

      <ChatInput
        value={input}
        onChange={setInput}
        onSend={send}
        onStop={stop}
        isGenerating={isGenerating}
        disabled={disabled}
        placeholder="Describe the interactive document you need..."
        sendLabel="Send"
      />
    </div>
  );
}
