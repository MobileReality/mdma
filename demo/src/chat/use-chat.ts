import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import {
  streamChatCompletion,
  chatCompletion,
  PROVIDER_PRESETS,
  DEFAULT_CONFIG,
  type LlmConfig,
  type ChatMessage as LlmMessage,
} from '../llm-client.js';
import { parseMarkdown as defaultParseMarkdown, createParser } from './parse-markdown.js';
import type { RemarkMdmaOptions } from '@mobile-reality/mdma-parser';
import type { ChatMsg } from './types.js';

export interface UseChatOptions {
  /** Custom parser options (e.g. custom component schemas). */
  parserOptions?: RemarkMdmaOptions;
  /** System prompt sent as the first message. Defaults to MDMA_AUTHOR_PROMPT. */
  systemPrompt?: string;
  /** Suffix appended to the user message each turn. `null` = no suffix. */
  userSuffix?: string | null;
  /** localStorage key suffix for chat history. Defaults to 'chat'. */
  storageKey?: string;
}

// ---- Config persistence ----

const CONFIG_KEY = 'mdma-demo-llm-config';

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

function historyKey(storageKey: string) {
  return `mdma-demo-${storageKey}-history`;
}

function loadSavedHistory(storageKey: string): StoredMsg[] {
  try {
    const saved = localStorage.getItem(historyKey(storageKey));
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return [];
}

function saveHistory(storageKey: string, messages: ChatMsg[]) {
  const serializable: StoredMsg[] = messages
    .filter((m) => m.content)
    .map(({ id, role, content }) => ({ id, role, content }));
  localStorage.setItem(historyKey(storageKey), JSON.stringify(serializable));
}

function clearSavedHistory(storageKey: string) {
  localStorage.removeItem(historyKey(storageKey));
}

const DEFAULT_USER_SUFFIX = '\n\nRespond with an MDMA Markdown document. Do not wrap it in code fences.';

// ---- Parse throttle interval ----

const PARSE_INTERVAL = 150; // ms — parse at most every 150ms during streaming

// ---- Hook ----

export function useChat(options?: UseChatOptions) {
  const [config, setConfig] = useState<LlmConfig>(loadSavedConfig);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Stable refs for options that shouldn't trigger re-renders
  const stableStorageKey = useRef(options?.storageKey ?? 'chat').current;
  const defaultSystemPrompt = useRef(
    buildSystemPrompt({ customPrompt: options?.systemPrompt }),
  ).current;
  // Active system prompt — can be overridden by a flow's customPrompt
  const systemPromptRef = useRef(defaultSystemPrompt);
  const stableUserSuffix = useRef(
    options?.userSuffix !== undefined ? options.userSuffix : DEFAULT_USER_SUFFIX,
  ).current;

  // Build parser — recreate when the customSchemas reference changes (e.g. after HMR or tab switch)
  const customSchemas = options?.parserOptions?.customSchemas;
  const parseMarkdownFn = useMemo(
    () => customSchemas ? createParser({ customSchemas }) : defaultParseMarkdown,
    [customSchemas],
  );
  const parseMarkdownRef = useRef(parseMarkdownFn);
  parseMarkdownRef.current = parseMarkdownFn;

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

    const stored = loadSavedHistory(stableStorageKey);
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
        parseMarkdownRef.current(m.content).then(({ ast, store }) => {
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
    saveHistory(stableStorageKey, messages);
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
      const { ast, store } = await parseMarkdownRef.current(content, existingStore);
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
      { role: 'system', content: systemPromptRef.current },
    ];

    for (const m of [...messages, userMsg]) {
      history.push({ role: m.role, content: m.content });
    }

    // Append instruction suffix for this turn (if configured)
    if (stableUserSuffix) {
      history[history.length - 1] = {
        role: 'user',
        content: `${text}${stableUserSuffix}`,
      };
    }

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
    clearSavedHistory(stableStorageKey);
    msgIdRef.current = 0;
    flowRef.current = null;
    systemPromptRef.current = defaultSystemPrompt;
    inputRef.current?.focus();
  }, [defaultSystemPrompt]);

  /** Update an assistant message's content and re-parse it. */
  const updateMessage = useCallback(
    async (msgId: number, content: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content } : m)),
      );
      await reparseLastAssistant(content, msgId);
    },
    [reparseLastAssistant],
  );

  // Active flow state for multi-step example flows
  const flowRef = useRef<{ steps: { userMessage: string; markdown: string }[]; currentStep: number } | null>(null);

  /** Inject a single user+assistant message pair and parse the markdown. */
  const injectStep = useCallback(
    async (userMessage: string, markdown: string) => {
      const userMsg: ChatMsg = {
        id: ++msgIdRef.current,
        role: 'user',
        content: userMessage,
        ast: null,
        store: null,
      };
      const assistantMsg: ChatMsg = {
        id: ++msgIdRef.current,
        role: 'assistant',
        content: markdown,
        ast: null,
        store: null,
      };
      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const asstId = assistantMsg.id;
      try {
        const { ast, store } = await parseMarkdownRef.current(markdown);
        setMessages((prev) =>
          prev.map((m) => (m.id === asstId ? { ...m, ast, store } : m)),
        );
      } catch {
        // parse error — content is still shown as raw text
      }
    },
    [],
  );

  /** Start a multi-step example flow. Loads the first step immediately. */
  const startFlow = useCallback(
    async (steps: { userMessage: string; markdown: string }[], customPrompt?: string) => {
      if (steps.length === 0) return;
      // Override system prompt if a flow-specific custom prompt is provided
      systemPromptRef.current = customPrompt
        ? buildSystemPrompt({ customPrompt })
        : defaultSystemPrompt;
      flowRef.current = { steps, currentStep: 0 };
      await injectStep(steps[0].userMessage, steps[0].markdown);
      flowRef.current!.currentStep = 1;
    },
    [injectStep, defaultSystemPrompt],
  );

  /** Advance the active flow to the next step (if any). */
  const advanceFlow = useCallback(async () => {
    const flow = flowRef.current;
    if (!flow || flow.currentStep >= flow.steps.length) return;
    const step = flow.steps[flow.currentStep];
    flow.currentStep++;
    await injectStep(step.userMessage, step.markdown);
  }, [injectStep]);

  /** Inject a pre-built markdown document as a user+assistant message pair. */
  const injectDocument = useCallback(
    async (label: string, markdown: string) => {
      flowRef.current = null; // clear any active flow
      await injectStep(`Show me: ${label}`, markdown);
    },
    [injectStep],
  );

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
    updateMessage,
    injectDocument,
    startFlow,
    advanceFlow,
  };
}
