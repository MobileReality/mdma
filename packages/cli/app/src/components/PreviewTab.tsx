import { useState, useRef, useEffect, useCallback } from 'react';
import { buildSystemPrompt } from '@mobile-reality/mdma-prompt-pack';
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import { streamChatCompletion, chatCompletion } from '../lib/llm-client.js';
import { parseMarkdown } from '../lib/parse-markdown.js';
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      abortRef.current = null;
    }
  }, [input, isGenerating, customPrompt, llmConfig, reparseMessage]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setInput('');
    msgIdRef.current = 0;
  }, []);

  const hasKey = llmConfig.apiKey.length > 0 || llmConfig.baseUrl.includes('localhost');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #222' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#e0e0e0' }}>
          Preview Chat
        </h3>
        {customPrompt ? (
          <span style={{ fontSize: '11px', color: '#22c55e' }}>customPrompt loaded</span>
        ) : (
          <span style={{ fontSize: '11px', color: '#f59e0b' }}>Generate a prompt first</span>
        )}
        <div style={{ flex: 1 }} />
        {messages.length > 0 && (
          <button type="button" onClick={clear} style={linkBtnStyle}>Clear</button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {messages.length === 0 && (
          <div style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '40px 20px' }}>
            {customPrompt ? (
              <>Test your generated prompt here. Ask the LLM to create an interactive document and see MDMA components render live.</>
            ) : (
              <>Switch to the <strong>Chat</strong> tab and generate a prompt first, then come back here to test it.</>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: msg.role === 'user' ? '#6366f1' : '#22c55e' }}>
              {msg.role === 'user' ? 'You' : 'MDMA AI'}
            </span>
            {msg.role === 'user' ? (
              <div style={userBubbleStyle}>{msg.content}</div>
            ) : msg.ast && msg.store ? (
              <div style={assistantBubbleStyle}>
                <MdmaDocument ast={msg.ast} store={msg.store} />
              </div>
            ) : msg.content ? (
              <div style={assistantBubbleStyle}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px', color: '#bbb' }}>
                  {msg.content}
                </pre>
                <span style={{ fontSize: '11px', color: '#6366f1' }}>Parsing...</span>
              </div>
            ) : (
              <div style={assistantBubbleStyle}>
                <span style={{ fontSize: '12px', color: '#666' }}>Generating...</span>
              </div>
            )}
          </div>
        ))}

        {error && (
          <div style={{ fontSize: '12px', color: '#ef4444', padding: '4px 8px' }}>{error}</div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: '8px', paddingTop: '8px', borderTop: '1px solid #222' }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (!isGenerating && hasKey) send();
            }
          }}
          placeholder="Describe the interactive document you need..."
          rows={2}
          disabled={!hasKey || !customPrompt}
          style={{
            flex: 1,
            padding: '8px 10px',
            border: '1px solid #333',
            borderRadius: '6px',
            background: '#1a1a1a',
            color: '#e0e0e0',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'none',
            outline: 'none',
            opacity: hasKey && customPrompt ? 1 : 0.5,
          }}
        />
        {isGenerating ? (
          <button type="button" onClick={stop} style={{ ...actionBtnStyle, background: '#7f1d1d', borderColor: '#ef4444' }}>
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={send}
            disabled={!hasKey || !customPrompt || !input.trim()}
            style={{ ...actionBtnStyle, opacity: hasKey && customPrompt ? 1 : 0.5 }}
          >
            Send
          </button>
        )}
      </div>
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'none',
  color: '#6366f1',
  cursor: 'pointer',
  fontSize: '12px',
  padding: 0,
};

const userBubbleStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  background: '#1e1b4b',
  color: '#c7d2fe',
  fontSize: '13px',
  lineHeight: 1.5,
  alignSelf: 'flex-end',
  maxWidth: '80%',
};

const assistantBubbleStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderRadius: '8px',
  background: '#1a1a1a',
  border: '1px solid #222',
  fontSize: '13px',
  lineHeight: 1.5,
  maxWidth: '100%',
  overflow: 'auto',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #6366f1',
  borderRadius: '6px',
  background: '#1e1b4b',
  color: '#a5b4fc',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-end',
};
