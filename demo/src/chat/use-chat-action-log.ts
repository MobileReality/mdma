import { useState, useRef, useEffect, useCallback } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { StoreAction } from '@mobile-reality/mdma-spec';
import type { ChatMsg } from './types.js';

export interface ChatActionEntry {
  id: number;
  timestamp: string;
  messageId: number;
  action: StoreAction;
}

export function useChatActionLog(messages: ChatMsg[]) {
  const [events, setEvents] = useState<ChatActionEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const eventIdRef = useRef(0);
  const subscriptionsRef = useRef(new Map<DocumentStore, () => void>());

  // Reconcile subscriptions whenever messages change
  useEffect(() => {
    const currentStores = new Map<DocumentStore, number>();

    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store) {
        currentStores.set(msg.store, msg.id);
      }
    }

    // Subscribe to new stores
    for (const [store, msgId] of currentStores) {
      if (!subscriptionsRef.current.has(store)) {
        const unsub = store.getEventBus().onAny((action: StoreAction) => {
          setEvents((prev) => [
            ...prev,
            {
              id: ++eventIdRef.current,
              timestamp: new Date().toLocaleTimeString(),
              messageId: msgId,
              action,
            },
          ]);
        });
        subscriptionsRef.current.set(store, unsub);
      }
    }

    // Unsubscribe from stores no longer in messages (after clear)
    for (const [store, unsub] of subscriptionsRef.current) {
      if (!currentStores.has(store)) {
        unsub();
        subscriptionsRef.current.delete(store);
      }
    }
  }, [messages]);

  // Cleanup all on unmount
  useEffect(() => {
    return () => {
      for (const unsub of subscriptionsRef.current.values()) {
        unsub();
      }
      subscriptionsRef.current.clear();
    };
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    eventIdRef.current = 0;
  }, []);

  return { events, isOpen, setIsOpen, clearEvents };
}
