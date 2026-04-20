import { useRef, useEffect, useState } from 'react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { SAMPLE_BINDING_DATA } from '../validator-prompts.js';
import type { ChatMsg } from '../chat/types.js';

interface UseFlowAutoAdvanceOptions {
  messages: ChatMsg[];
  promptKey: string;
  input: string;
  isGenerating: boolean;
  setInput: (value: string) => void;
  send: () => void;
  flowComplete: boolean;
}

export function useFlowAutoAdvance({
  messages,
  promptKey,
  input,
  isGenerating,
  setInput,
  send,
  flowComplete,
}: UseFlowAutoAdvanceOptions) {
  const subscribedStores = useRef(new Set<DocumentStore>());
  const pendingSendRef = useRef(false);
  const setInputRef = useRef(setInput);
  setInputRef.current = setInput;
  const flowCompleteRef = useRef(false);
  const [showFlowComplete, setShowFlowComplete] = useState(false);

  flowCompleteRef.current = flowComplete;

  // Seed stores with sample binding data
  const seededStores = useRef(new Set<DocumentStore>());
  useEffect(() => {
    const sampleData = SAMPLE_BINDING_DATA[promptKey];
    if (!sampleData) return;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !seededStores.current.has(msg.store)) {
        seededStores.current.add(msg.store);
        for (const [componentId, fields] of Object.entries(sampleData)) {
          for (const [field, value] of Object.entries(fields)) {
            msg.store.dispatch({ type: 'FIELD_CHANGED', componentId, field, value });
          }
        }
      }
    }
  }, [messages, promptKey]);

  // Subscribe to action events to auto-advance
  useEffect(() => {
    const ADVANCE_EVENTS = ['ACTION_TRIGGERED', 'APPROVAL_GRANTED', 'APPROVAL_DENIED'] as const;
    for (const msg of messages) {
      if (msg.role === 'assistant' && msg.store && !subscribedStores.current.has(msg.store)) {
        subscribedStores.current.add(msg.store);
        for (const eventType of ADVANCE_EVENTS) {
          msg.store.getEventBus().on(eventType, () => {
            if (flowCompleteRef.current) {
              setShowFlowComplete(true);
              return;
            }
            setTimeout(() => {
              pendingSendRef.current = true;
              setInputRef.current('Continue to the next step');
            }, 500);
          });
        }
      }
    }
  }, [messages]);

  // Auto-send when pending action trigger sets the input
  useEffect(() => {
    if (pendingSendRef.current && input.trim() && !isGenerating) {
      pendingSendRef.current = false;
      send();
    }
  }, [input, isGenerating, send]);

  useEffect(() => {
    return () => {
      subscribedStores.current.clear();
    };
  }, []);

  const clearSeededStores = () => {
    seededStores.current.clear();
  };

  return { showFlowComplete, setShowFlowComplete, clearSeededStores };
}
