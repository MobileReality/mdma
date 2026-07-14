/**
 * Everything this backend says on the wire, in AG-UI's vocabulary.
 *
 *  - MDMA documents go out-of-band on CUSTOM `mdma` events, never in prose, so no markup leaks
 *    into the chat channel.
 *  - Prose goes on TEXT_MESSAGE_*, chunked for a streaming feel.
 *  - Shared state goes on STATE_SNAPSHOT; the bridge pushes it into live components.
 *  - Tool calls go on TOOL_CALL_*, which the bridge turns into the activity feed.
 */
import { randomUUID } from 'node:crypto';
import { EventType } from '@ag-ui/core';
import { primaryComponentId } from './mdma';
import { type ThreadState, hydrateDoc, hydrateRenderedDocs, mergeValues } from './state';

export type Send = (event: Record<string, unknown>) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TEXT_CHUNK = 24;

export interface Emitter {
  /** CUSTOM 'mdma' event — out-of-band MDMA delivery. */
  mdma: (doc: string) => void;
  /** TEXT_MESSAGE_* — chunked for a streaming feel. */
  text: (s: string) => Promise<void>;
  /** Write shared state + STATE_SNAPSHOT. */
  state: (componentId: string, values: Record<string, unknown>) => void;
  toolStart: (id: string, name: string) => void;
  toolArgs: (id: string, argsDelta: string) => void;
  toolEnd: (id: string) => void;
  toolResult: (id: string, content: string) => void;
  /** Every MDMA emitted this run — used to spot an approval gate to park the run on. */
  emittedDocs: string[];
}

export function createEmitter(send: Send, state: ThreadState): Emitter {
  const emittedDocs: string[] = [];
  const sendSnapshot = () => send({ type: EventType.STATE_SNAPSHOT, snapshot: state.components });

  return {
    emittedDocs,

    mdma: (doc) => {
      emittedDocs.push(doc);
      const primary = primaryComponentId(doc);
      if (primary) state.docs[primary] = doc;
      // Seed the new form from the remembered profile and snapshot it BEFORE the document, so the
      // bridge has the values ready and the form renders pre-filled rather than blank-then-filled.
      if (hydrateDoc(state, doc)) sendSnapshot();
      send({
        type: EventType.CUSTOM,
        name: 'mdma',
        value: { messageId: randomUUID(), markdown: doc },
      });
    },

    text: async (s) => {
      const messageId = randomUUID();
      send({ type: EventType.TEXT_MESSAGE_START, messageId, role: 'assistant' });
      for (let i = 0; i < s.length; i += TEXT_CHUNK) {
        send({
          type: EventType.TEXT_MESSAGE_CONTENT,
          messageId,
          delta: s.slice(i, i + TEXT_CHUNK),
        });
        await sleep(20);
      }
      send({ type: EventType.TEXT_MESSAGE_END, messageId });
    },

    state: (componentId, values) => {
      mergeValues(state, componentId, values);
      sendSnapshot();
      // A profile change can pre-fill forms that are already on screen, so re-hydrate them and
      // snapshot again — the bridge applies state to live components reactively.
      if (componentId === 'profile' && hydrateRenderedDocs(state)) sendSnapshot();
    },

    toolStart: (id, name) =>
      send({ type: EventType.TOOL_CALL_START, toolCallId: id, toolCallName: name }),
    toolArgs: (id, argsDelta) =>
      send({ type: EventType.TOOL_CALL_ARGS, toolCallId: id, delta: argsDelta }),
    toolEnd: (id) => send({ type: EventType.TOOL_CALL_END, toolCallId: id }),
    toolResult: (id, content) =>
      send({
        type: EventType.TOOL_CALL_RESULT,
        messageId: randomUUID(),
        toolCallId: id,
        content,
        role: 'tool',
      }),
  };
}
