import { useState, useRef, useEffect, useCallback } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { StoreAction } from '@mobile-reality/mdma-spec';
import type { ChatActionEntry } from '../chat/use-chat-action-log.js';
import type { AgentDisplayTurn, AssistantTurn } from './types.js';

/**
 * Subscribes to every DocumentStore produced by generate_mdma tool calls and
 * emits ChatActionEntry events compatible with the shared ChatActionLog component.
 * The `messageId` field holds a 1-based tool-call counter.
 */
export function useAgentActionLog(turns: AgentDisplayTurn[]) {
  const [events, setEvents] = useState<ChatActionEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const eventIdRef = useRef(0);
  const callCounterRef = useRef(new Map<DocumentStore, number>());
  const subscriptionsRef = useRef(new Map<DocumentStore, () => void>());

  useEffect(() => {
    const currentStores = new Map<DocumentStore, number>();
    let callIndex = 0;

    for (const turn of turns) {
      if (turn.role !== 'assistant') continue;
      for (const block of (turn as AssistantTurn).blocks) {
        if (block.type === 'tool_use' && block.store) {
          callIndex++;
          const existing = callCounterRef.current.get(block.store);
          currentStores.set(block.store, existing ?? callIndex);
          if (existing === undefined) callCounterRef.current.set(block.store, callIndex);
        }
      }
    }

    for (const [store, callNum] of currentStores) {
      if (!subscriptionsRef.current.has(store)) {
        const unsub = store.getEventBus().onAny((action: StoreAction) => {
          setEvents((prev) => [
            ...prev,
            {
              id: ++eventIdRef.current,
              timestamp: new Date().toLocaleTimeString(),
              messageId: callNum,
              action,
            },
          ]);
        });
        subscriptionsRef.current.set(store, unsub);
      }
    }

    for (const [store, unsub] of subscriptionsRef.current) {
      if (!currentStores.has(store)) {
        unsub();
        subscriptionsRef.current.delete(store);
        callCounterRef.current.delete(store);
      }
    }
  }, [turns]);

  useEffect(() => {
    return () => {
      for (const unsub of subscriptionsRef.current.values()) unsub();
      subscriptionsRef.current.clear();
      callCounterRef.current.clear();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    eventIdRef.current = 0;
  }, []);

  return { events, isOpen, setIsOpen, clearEvents };
}
