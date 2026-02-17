import { useState, useRef, useCallback, useEffect } from 'react';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mdma/parser';
import { createDocumentStore, type DocumentStore } from '@mdma/runtime';
import { MdmaDocument } from '@mdma/renderer-react';
import { MDMA_AUTHOR_PROMPT } from '@mdma/prompt-pack';
import type { MdmaRoot } from '@mdma/spec';
import {
  streamChatCompletion,
  chatCompletion,
  PROVIDER_PRESETS,
  DEFAULT_CONFIG,
  type LlmConfig,
  type ChatMessage as LlmMessage,
} from './llm-client.js';

// ---- Types ----

interface ChatMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  /** Parsed AST for assistant messages (null while streaming / on error) */
  ast: MdmaRoot | null;
  /** Document store for assistant messages */
  store: DocumentStore | null;
}

const STORAGE_KEY = 'mdma-demo-llm-config';

function loadSavedConfig(): LlmConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(config: LlmConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

// Module-level singleton — initialized once, reused across all parses
const processor = unified().use(remarkParse).use(remarkMdma);

async function parseMarkdown(
  markdown: string,
  existingStore?: DocumentStore,
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const tree = processor.parse(markdown);
  const ast = (await processor.run(tree)) as MdmaRoot;
  if (existingStore) {
    existingStore.updateAst(ast);
    return { ast, store: existingStore };
  }
  return { ast, store: createDocumentStore(ast) };
}

// ---- Component ----

export function ChatView() {
  const [config, setConfig] = useState<LlmConfig>(loadSavedConfig);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  // Track which assistant messages are showing raw source instead of rendered view
  const [sourceViewIds, setSourceViewIds] = useState<Set<number>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Generation counter to discard stale parse results
  const parseGenRef = useRef(0);
  const parsingRef = useRef(false);
  const pendingParseRef = useRef<{ content: string; msgId: number } | null>(null);

  // Ref to access current messages without adding to callback deps
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Parse assistant message content into MDMA AST + store.
  // Uses a "latest-wins" queue: if a parse is already in flight, the newest
  // request is queued and processed immediately when the current one finishes.
  // Reuses the existing store (if any) to preserve user-entered state.
  const reparseLastAssistant = useCallback(async (content: string, msgId: number) => {
    if (parsingRef.current) {
      // A parse is already running — queue this one so it runs next
      pendingParseRef.current = { content, msgId };
      return;
    }
    parsingRef.current = true;
    const gen = ++parseGenRef.current;

    try {
      // Look up the existing store for this message to preserve user state
      const existingStore = messagesRef.current.find((m) => m.id === msgId)?.store ?? undefined;
      const { ast, store } = await parseMarkdown(content, existingStore);
      // Only apply if this is still the latest generation
      if (gen >= parseGenRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, ast, store } : m)),
        );
      }
    } catch {
      // Parse errors during streaming are fine — will retry on next chunk
    } finally {
      parsingRef.current = false;
      // If a newer request was queued while we were parsing, run it now
      const pending = pendingParseRef.current;
      if (pending) {
        pendingParseRef.current = null;
        reparseLastAssistant(pending.content, pending.msgId);
      }
    }
  }, []);

  const updateConfig = useCallback((patch: Partial<LlmConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const applyPreset = useCallback((presetName: string) => {
    const preset = PROVIDER_PRESETS[presetName];
    if (preset) {
      const next = { ...preset, apiKey: config.apiKey };
      setConfig(next);
      saveConfig(next);
    }
  }, [config.apiKey]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput('');
    setError(null);

    // Add user message
    const userMsg: ChatMsg = {
      id: ++msgIdRef.current,
      role: 'user',
      content: text,
      ast: null,
      store: null,
    };

    // Add placeholder assistant message
    const assistantMsg: ChatMsg = {
      id: ++msgIdRef.current,
      role: 'assistant',
      content: '',
      ast: null,
      store: null,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsGenerating(true);

    // Build conversation history for the LLM
    const history: LlmMessage[] = [
      { role: 'system', content: MDMA_AUTHOR_PROMPT },
    ];

    // Include prior messages for context
    for (const m of [...messages, userMsg]) {
      if (m.role === 'user') {
        history.push({ role: 'user', content: m.content });
      } else {
        history.push({ role: 'assistant', content: m.content });
      }
    }

    // Append instruction for this turn
    history[history.length - 1] = {
      role: 'user',
      content: `${text}\n\nRespond with an MDMA Markdown document. Do not wrap it in code fences.`,
    };

    abortRef.current = new AbortController();
    const asstId = assistantMsg.id;
    let lastParseTime = 0;
    const PARSE_INTERVAL = 150; // ms — parse at most every 150ms during streaming

    try {
      let fullOutput = '';
      try {
        for await (const chunk of streamChatCompletion(config, history, abortRef.current.signal)) {
          fullOutput += chunk;
          const snapshot = fullOutput;
          // Update raw content immediately (preserves existing ast/store)
          setMessages((prev) =>
            prev.map((m) => (m.id === asstId ? { ...m, content: snapshot } : m)),
          );
          // Re-parse at a throttled interval so the rendered document updates live
          const now = Date.now();
          if (now - lastParseTime >= PARSE_INTERVAL) {
            lastParseTime = now;
            reparseLastAssistant(snapshot, asstId);
          }
        }
      } catch (streamErr) {
        if (abortRef.current.signal.aborted) throw streamErr;
        fullOutput = await chatCompletion(config, history, abortRef.current.signal);
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, content: fullOutput } : m)),
        );
      }

      // Final parse with complete content
      await reparseLastAssistant(fullOutput, asstId);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }, [input, config, isGenerating, messages, reparseLastAssistant]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const toggleSourceView = useCallback((msgId: number) => {
    setSourceViewIds((prev) => {
      const next = new Set(prev);
      if (next.has(msgId)) next.delete(msgId);
      else next.add(msgId);
      return next;
    });
  }, []);

  return (
    <div className="chat-layout">
      {/* Settings bar */}
      <div className="chat-settings-bar">
        <button
          type="button"
          className="chat-settings-toggle"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? 'Hide Settings' : 'LLM Settings'}
        </button>
        {showSettings && (
          <div className="chat-settings">
            <div className="ai-settings-presets">
              {Object.keys(PROVIDER_PRESETS).map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`ai-preset-btn ${config.baseUrl === PROVIDER_PRESETS[name].baseUrl ? 'ai-preset-btn--active' : ''}`}
                  onClick={() => applyPreset(name)}
                >
                  {name}
                </button>
              ))}
            </div>
            <div className="chat-settings-fields">
              <label className="ai-setting">
                <span>API Base URL</span>
                <input
                  type="text"
                  value={config.baseUrl}
                  onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                />
              </label>
              <label className="ai-setting">
                <span>API Key</span>
                <input
                  type="password"
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                />
              </label>
              <label className="ai-setting">
                <span>Model</span>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => updateConfig({ model: e.target.value })}
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <p className="chat-empty-title">MDMA Chat</p>
            <p className="chat-empty-hint">
              Describe an interactive document and the AI will generate it as a live, interactive MDMA form.
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const showSource = sourceViewIds.has(msg.id);
          return (
            <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
              <div className="chat-msg-header">
                <span className="chat-msg-label">{msg.role === 'user' ? 'You' : 'MDMA AI'}</span>
                {msg.role === 'assistant' && msg.content && (
                  <button
                    type="button"
                    className={`chat-msg-view-toggle ${showSource ? 'chat-msg-view-toggle--active' : ''}`}
                    onClick={() => toggleSourceView(msg.id)}
                  >
                    {showSource ? 'Rendered' : 'Source'}
                  </button>
                )}
              </div>
              <div className="chat-msg-body">
                {msg.role === 'user' ? (
                  <p>{msg.content}</p>
                ) : showSource && msg.content ? (
                  <pre className="chat-msg-source">{msg.content}</pre>
                ) : msg.ast && msg.store ? (
                  <>
                    <MdmaDocument ast={msg.ast} store={msg.store} />
                    {isGenerating && msg.id === messages[messages.length - 1]?.id && (
                      <span className="chat-msg-streaming">Streaming...</span>
                    )}
                  </>
                ) : msg.content ? (
                  <div className="chat-msg-parsing">
                    <span className="chat-msg-typing">Parsing document...</span>
                    <pre className="chat-msg-raw">{msg.content}</pre>
                  </div>
                ) : (
                  <span className="chat-msg-typing">Generating...</span>
                )}
              </div>
            </div>
          );
        })}

        {error && (
          <div className="chat-error">{error}</div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe the interactive document you need..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        {isGenerating ? (
          <button type="button" className="chat-stop-btn" onClick={stop}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            className="chat-send-btn"
            onClick={send}
            disabled={!input.trim()}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}
