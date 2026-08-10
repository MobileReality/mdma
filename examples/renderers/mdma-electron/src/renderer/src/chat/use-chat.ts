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

interface ActiveStream {
  requestId: string;
  assistantId: number;
  parser: StreamParser;
}

export function useChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = useRef<ActiveStream | null>(null);
  const nextId = useRef(0);
  const parsers = useRef<StreamParser[]>([]);

  const patchTurn = useCallback((id: number, patch: Partial<Turn>) => {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, ...patch } : turn)));
  }, []);

  useEffect(() => {
    const isCurrent = (requestId: string) => active.current?.requestId === requestId;

    const offDelta = window.mdma.chat.onDelta(({ requestId, full }) => {
      if (!isCurrent(requestId) || !active.current) return;
      const { assistantId, parser } = active.current;
      patchTurn(assistantId, { content: full });
      void parser.schedule(full);
    });

    const offEnd = window.mdma.chat.onEnd(({ requestId, full }) => {
      if (!isCurrent(requestId) || !active.current) return;
      // A chunk may have landed mid-parse; schedule the final text so it is never dropped.
      if (full) void active.current.parser.schedule(full);
    });

    const offError = window.mdma.chat.onError(({ requestId, message }) => {
      if (!isCurrent(requestId)) return;
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
      active.current = { requestId, assistantId, parser };
      setIsStreaming(true);

      try {
        await window.mdma.chat.start({ requestId, messages: history });
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        active.current = null;
        setIsStreaming(false);
      }
    },
    [isStreaming, patchTurn, turns],
  );

  const stop = useCallback(() => {
    const requestId = active.current?.requestId;
    if (requestId) void window.mdma.chat.abort(requestId);
  }, []);

  const clear = useCallback(() => {
    stop();
    for (const parser of parsers.current) parser.dispose();
    parsers.current = [];
    setTurns([]);
    setError(null);
  }, [stop]);

  return { turns, isStreaming, error, send, stop, clear };
}
