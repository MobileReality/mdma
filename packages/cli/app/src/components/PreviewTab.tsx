import { useState, useRef, useCallback } from 'react';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { streamChatCompletion, chatCompletion } from '../lib/llm-client.js';
import { parseMarkdown } from '../lib/parse-markdown.js';
import { PreviewMessage } from './PreviewMessage.js';
import { ChatInput } from './ui/ChatInput.js';
import type { LlmConfig, ChatMessage } from '../lib/llm-client.js';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';

interface PreviewTabProps {
  customPrompt: string;
  llmConfig: LlmConfig;
}

interface PreviewMsg {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  ast: MdmaRoot | null;
  store: DocumentStore | null;
}

const PARSE_INTERVAL = 200;

export function PreviewTab({ customPrompt, llmConfig }: PreviewTabProps) {
  const [messages, setMessages] = useState<PreviewMsg[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const msgIdRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const reparseMessage = useCallback(async (content: string, msgId: number) => {
    try {
      const existing = messagesRef.current.find((m) => m.id === msgId)?.store ?? undefined;
      const { ast, store } = await parseMarkdown(content, existing);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, ast, store } : m)),
      );
    } catch {
      // parse errors during streaming are fine
    }
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || isGenerating) return;

    setInput('');
    setError(null);
    setIsGenerating(true);

    const userMsg: PreviewMsg = { id: ++msgIdRef.current, role: 'user', content: text, ast: null, store: null };
    const assistantMsg: PreviewMsg = { id: ++msgIdRef.current, role: 'assistant', content: '', ast: null, store: null };

    const prevMessages = messagesRef.current;
    setMessages([...prevMessages, userMsg, assistantMsg]);
    scrollToBottom();

    const systemPrompt = buildSystemPrompt({ customPrompt: customPrompt || undefined });
    const history: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...prevMessages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: `${text}\n\nRespond with an MDMA Markdown document. Do not wrap it in code fences.` },
    ];

    abortRef.current = new AbortController();
    const asstId = assistantMsg.id;
    let lastParseTime = 0;

    try {
      let fullOutput = '';
      try {
        for await (const chunk of streamChatCompletion(llmConfig, history, abortRef.current.signal)) {
          fullOutput += chunk;
          const snapshot = fullOutput;
          setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: snapshot } : m)));
          const now = Date.now();
          if (now - lastParseTime >= PARSE_INTERVAL) {
            lastParseTime = now;
            reparseMessage(snapshot, asstId);
          }
        }
      } catch (streamErr) {
        if (abortRef.current.signal.aborted) throw streamErr;
        fullOutput = await chatCompletion(llmConfig, history, abortRef.current.signal);
        setMessages((prev) => prev.map((m) => (m.id === asstId ? { ...m, content: fullOutput } : m)));
      }
      await reparseMessage(fullOutput, asstId);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        setError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [input, isGenerating, customPrompt, llmConfig, reparseMessage, scrollToBottom]);

  const stop = useCallback(() => { abortRef.current?.abort(); }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    msgIdRef.current = 0;
  }, []);

  const hasKey = llmConfig.apiKey.length > 0 || llmConfig.baseUrl.includes('localhost');
  const disabled = !hasKey || !customPrompt;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex gap-2 items-center pb-2 border-b border-border-light">
        <h3 className="m-0 text-sm font-semibold text-text-primary">Preview Chat</h3>
        {customPrompt
          ? <span className="text-[11px] text-success">customPrompt loaded</span>
          : <span className="text-[11px] text-warning">Generate a prompt first</span>
        }
        <div className="flex-1" />
        {messages.length > 0 && (
          <button type="button" onClick={clear} className="border-none bg-transparent text-primary cursor-pointer text-xs p-0 hover:text-primary-hover">
            Clear
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-2 flex flex-col gap-3">
        {messages.length === 0 && (
          <div className="text-text-muted text-sm text-center py-10 px-5">
            {customPrompt
              ? <>Test your generated prompt here. Ask the LLM to create an interactive document and see MDMA components render live.</>
              : <>Switch to the <strong>Chat</strong> tab and generate a prompt first, then come back here to test it.</>
            }
          </div>
        )}
        {messages.map((msg) => (
          <PreviewMessage key={msg.id} role={msg.role} content={msg.content} ast={msg.ast} store={msg.store} />
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
