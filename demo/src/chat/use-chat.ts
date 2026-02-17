import { useState, useRef, useCallback, useEffect } from 'react';
import { MDMA_AUTHOR_PROMPT } from '@mdma/prompt-pack';
import {
  streamChatCompletion,
  chatCompletion,
  PROVIDER_PRESETS,
  DEFAULT_CONFIG,
  type LlmConfig,
  type ChatMessage as LlmMessage,
} from '../llm-client.js';
import { parseMarkdown as defaultParseMarkdown, createParser } from './parse-markdown.js';
import type { RemarkMdmaOptions } from '@mdma/parser';
import type { ChatMsg } from './types.js';

export interface UseChatOptions {
  /** Custom parser options (e.g. custom component schemas). */
  parserOptions?: RemarkMdmaOptions;
}

// ---- Config persistence ----

const CONFIG_KEY = 'mdma-demo-llm-config';
const HISTORY_KEY = 'mdma-demo-chat-history';

function loadSavedConfig(): LlmConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(config: LlmConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** Serializable subset of ChatMsg (ast/store can't be serialized). */
interface StoredMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
}

function loadSavedHistory(): StoredMsg[] {
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveHistory(messages: ChatMsg[]) {
  const serializable: StoredMsg[] = messages
    .filter((m) => m.content)
    .map(({ id, role, content }) => ({ id, role, content }));
  localStorage.setItem(HISTORY_KEY, JSON.stringify(serializable));
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

// ---- Parse throttle interval ----

const PARSE_INTERVAL = 150; // ms — parse at most every 150ms during streaming

// ---- Hook ----

export function useChat(options?: UseChatOptions) {
  const [config, setConfig] = useState<LlmConfig>(loadSavedConfig);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Build parser — use custom parser if parserOptions are provided, otherwise default
  const parseMarkdown = useRef(
    options?.parserOptions ? createParser(options.parserOptions) : defaultParseMarkdown,
  ).current;

  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const restoredRef = useRef(false);

  // Generation counter to discard stale parse results
  const parseGenRef = useRef(0);
  const parsingRef = useRef(false);
  const pendingParseRef = useRef<{ content: string; msgId: number } | null>(null);

  // Ref to access current messages without adding to callback deps
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Restore chat history from localStorage on mount
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;

    const stored = loadSavedHistory();
    if (stored.length === 0) return;

    // Restore the highest ID so new messages don't collide
    msgIdRef.current = Math.max(...stored.map((m) => m.id));

    // Hydrate messages and re-parse assistant content
    const hydrated: ChatMsg[] = stored.map((m) => ({
      ...m,
      ast: null,
      store: null,
    }));
    setMessages(hydrated);

    // Re-parse all assistant messages to rebuild AST + store
    for (const m of hydrated) {
      if (m.role === 'assistant' && m.content) {
        parseMarkdown(m.content).then(({ ast, store }) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === m.id ? { ...msg, ast, store } : msg)),
          );
        }).catch(() => { /* ignore parse errors from old messages */ });
      }
    }
  }, []);

  // Persist messages to localStorage whenever they change (skip empty initial state)
  useEffect(() => {
    if (!restoredRef.current) return;
    saveHistory(messages);
  }, [messages]);

  // Parse assistant message content into MDMA AST + store.
  // Uses a "latest-wins" queue: if a parse is already in flight, the newest
  // request is queued and processed immediately when the current one finishes.
  const reparseLastAssistant = useCallback(async (content: string, msgId: number) => {
    if (parsingRef.current) {
      pendingParseRef.current = { content, msgId };
      return;
    }
    parsingRef.current = true;
    const gen = ++parseGenRef.current;

    try {
      const existingStore = messagesRef.current.find((m) => m.id === msgId)?.store ?? undefined;
      const { ast, store } = await parseMarkdown(content, existingStore);
      if (gen >= parseGenRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, ast, store } : m)),
        );
      }
    } catch {
      // Parse errors during streaming are fine — will retry on next chunk
    } finally {
      parsingRef.current = false;
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

    const userMsg: ChatMsg = {
      id: ++msgIdRef.current,
      role: 'user',
      content: text,
      ast: null,
      store: null,
    };

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

    for (const m of [...messages, userMsg]) {
      history.push({ role: m.role, content: m.content });
    }

    // Append instruction for this turn
    history[history.length - 1] = {
      role: 'user',
      content: `${text}\n\nRespond with an MDMA Markdown document. Do not wrap it in code fences.`,
    };

    abortRef.current = new AbortController();
    const asstId = assistantMsg.id;
    let lastParseTime = 0;

    try {
      let fullOutput = '';
      try {
        for await (const chunk of streamChatCompletion(config, history, abortRef.current.signal)) {
          fullOutput += chunk;
          const snapshot = fullOutput;
          setMessages((prev) =>
            prev.map((m) => (m.id === asstId ? { ...m, content: snapshot } : m)),
          );
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

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    clearHistory();
    msgIdRef.current = 0;
    inputRef.current?.focus();
  }, []);

  return {
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
  };
}
