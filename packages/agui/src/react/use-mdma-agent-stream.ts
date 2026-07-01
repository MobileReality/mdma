import { useEffect, useRef, useState } from 'react';
import {
  createMdmaAgentBridge,
  type MdmaAgentBridge,
  type MdmaAgentBridgeOptions,
  type MdmaMessageState,
} from '../bridge.js';
import type { AguiAgent } from '../types.js';

export interface UseMdmaAgentStreamResult {
  /** Rendered documents in first-seen message order. */
  documents: MdmaMessageState[];
  /** The underlying bridge (for `flush`, imperative access, tests). */
  bridge: MdmaAgentBridge | null;
}

/**
 * Subscribe a React component to an AG-UI agent's MDMA output. Creates one bridge per `agent`
 * instance and re-renders as streamed documents are (re)parsed. `options` may change between
 * renders without tearing down the bridge — the latest callbacks are always used.
 */
export function useMdmaAgentStream(
  agent: AguiAgent,
  options: MdmaAgentBridgeOptions = {},
): UseMdmaAgentStreamResult {
  const [documents, setDocuments] = useState<MdmaMessageState[]>([]);
  const [bridge, setBridge] = useState<MdmaAgentBridge | null>(null);

  // Keep the freshest options without re-subscribing on every render.
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    const order: string[] = [];

    const b = createMdmaAgentBridge(agent, {
      // Bridge-level config that shouldn't change per render — read once.
      throttleMs: optionsRef.current.throttleMs,
      createRegistry: optionsRef.current.createRegistry,
      now: optionsRef.current.now,
      onDocument: (message) => {
        if (!order.includes(message.messageId)) order.push(message.messageId);
        optionsRef.current.onDocument?.(message);
        setDocuments((prev) => {
          const next = prev.filter((m) => m.messageId !== message.messageId);
          next.push(message);
          next.sort((a, c) => order.indexOf(a.messageId) - order.indexOf(c.messageId));
          return next;
        });
      },
      onAction: (action, message) => optionsRef.current.onAction?.(action, message),
      resume: optionsRef.current.resume
        ? (action, message, a) => optionsRef.current.resume!(action, message, a)
        : undefined,
    });

    setBridge(b);
    setDocuments([]);
    return () => {
      b.dispose();
      setBridge(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on agent only
  }, [agent]);

  return { documents, bridge };
}
