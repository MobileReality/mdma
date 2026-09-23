import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import type { ChatMessage } from '@shared/ipc';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SYSTEM_PROMPT } from '../agent.js';
import { type StreamParser, createStreamParser } from './stream-parser.js';

export interface Turn {
  id: number;
  role: 'user' | 'assistant';
  /** Raw text. For an assistant turn, Markdown that may embed `mdma` fences. */
  content: string;
  ast?: MdmaRoot;
  store?: DocumentStore;
}

interface Stream {
  assistantId: number;
  parser: StreamParser;
}

export function useChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keyed by requestId and cleared by the end/error handlers, never by `send`:
  // `invoke` resolves before the terminal event is delivered, so a stream tracked
  // by a single "active" ref would drop the very error it was waiting for.
  const streams = useRef(new Map<string, Stream>());
  const activeRequest = useRef<string | null>(null);
  const nextId = useRef(0);
  const parsers = useRef<StreamParser[]>([]);

  const patchTurn = useCallback((id: number, patch: Partial<Turn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }, []);

  useEffect(() => {
    const offDelta = window.mdma.chat.onDelta(({ requestId, full }) => {
      const stream = streams.current.get(requestId);
      if (!stream) return;
      patchTurn(stream.assistantId, { content: full });
      void stream.parser.schedule(full);
    });

    const offEnd = window.mdma.chat.onEnd(({ requestId, full }) => {
      const stream = streams.current.get(requestId);
      if (!stream) return;
      streams.current.delete(requestId);
      // A chunk may have landed mid-parse; schedule the final text so it is never dropped.
      if (full) void stream.parser.schedule(full);
    });

    const offError = window.mdma.chat.onError(({ requestId, message }) => {
      if (!streams.current.delete(requestId)) return;
      setError(message);
    });

    return () => {
      offDelta();
      offEnd();
      offError();
    };
  }, [patchTurn]);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      setError(null);
      const userId = nextId.current++;
      const assistantId = nextId.current++;

      // The model sees the plain-text transcript, so build it from the turns we
      // have plus this message — `setTurns` has not flushed yet at this point.
      const history: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...turns.map((turn) => ({ role: turn.role, content: turn.content }) as ChatMessage),
        { role: 'user', content: trimmed },
      ];

      setTurns((current) => [
        ...current,
        { id: userId, role: 'user', content: trimmed },
        { id: assistantId, role: 'assistant', content: '' },
      ]);

      const parser = createStreamParser((ast, store) => patchTurn(assistantId, { ast, store }));
      parsers.current.push(parser);

      const requestId = crypto.randomUUID();
      streams.current.set(requestId, { assistantId, parser });
      activeRequest.current = requestId;
      setIsStreaming(true);

      try {
        await window.mdma.chat.start({ requestId, messages: history });
      } catch (cause) {
        streams.current.delete(requestId);
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        activeRequest.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming, patchTurn, turns],
  );

  const stop = useCallback(() => {
    const requestId = activeRequest.current;
    if (requestId) void window.mdma.chat.abort(requestId);
  }, []);

  const clear = useCallback(() => {
    stop();
    for (const parser of parsers.current) parser.dispose();
    parsers.current = [];
    streams.current.clear();
    setTurns([]);
    setError(null);
  }, [stop]);

  return { turns, isStreaming, error, send, stop, clear };
}
