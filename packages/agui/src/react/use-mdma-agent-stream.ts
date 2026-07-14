import { useEffect, useRef, useState } from 'react';
import {
  createMdmaAgentBridge,
  type MdmaActivity,
  type MdmaAgentBridge,
  type MdmaAgentBridgeOptions,
  type MdmaMessageState,
  type MdmaSharedState,
} from '../bridge.js';
import type { AguiAgent, AguiInterrupt } from '../types.js';

export interface UseMdmaAgentStreamResult {
  /** Rendered documents in first-seen message order. */
  documents: MdmaMessageState[];
  /** Agentic activity (tool calls / steps / reasoning) in first-seen order. */
  activity: MdmaActivity[];
  /** Human-in-the-loop interrupts the run is currently parked on. */
  interrupts: readonly AguiInterrupt[];
  /** The agent's shared state (`componentId → values`) hydrating new MDMA stores. */
  state: Readonly<MdmaSharedState>;
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
  const [activity, setActivity] = useState<MdmaActivity[]>([]);
  const [interrupts, setInterrupts] = useState<readonly AguiInterrupt[]>([]);
  const [state, setState] = useState<Readonly<MdmaSharedState>>({});
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
      initialState: optionsRef.current.initialState,
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
      onActivity: (item, feed) => {
        optionsRef.current.onActivity?.(item, feed);
        setActivity((prev) => {
          const next = prev.filter((a) => a.id !== item.id);
          const at = feed.findIndex((a) => a.id === item.id);
          next.splice(at, 0, item);
          return next;
        });
      },
      resumeMode: optionsRef.current.resumeMode,
      onInterrupt: (pending) => {
        optionsRef.current.onInterrupt?.(pending);
        setInterrupts([...pending]);
      },
      onState: (s) => {
        optionsRef.current.onState?.(s);
        setState({ ...s });
      },
      onAction: (action, message) => optionsRef.current.onAction?.(action, message),
      resume: optionsRef.current.resume
        ? (action, message, a) => optionsRef.current.resume!(action, message, a)
        : undefined,
    });

    setBridge(b);
    setDocuments([]);
    setActivity([]);
    setInterrupts([]);
    setState({});
    return () => {
      b.dispose();
      setBridge(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally keyed on agent only
  }, [agent]);

  return { documents, activity, interrupts, state, bridge };
}
