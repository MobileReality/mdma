import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import { forwardAudit } from '../bridge/forward-audit.js';
import { runActionsInMain } from '../bridge/run-actions.js';
import { parseDocument, reparseInto } from '../mdma.js';

export interface StreamParser {
  schedule(markdown: string): Promise<void>;
  dispose(): void;
}

/**
 * Parses a growing assistant message into one long-lived store. Parsing on every
 * token is wasteful and asynchronous, and two chunks racing would each create a
 * store — so chunks only mark the latest text dirty and a single worker drains
 * it, always finishing on the final text.
 */
export function createStreamParser(
  onParsed: (ast: MdmaRoot, store: DocumentStore) => void,
): StreamParser {
  let store: DocumentStore | null = null;
  let pending: string | null = null;
  let running: Promise<void> | null = null;
  const disposers: Array<() => void> = [];

  async function drain(): Promise<void> {
    while (pending !== null) {
      const markdown = pending;
      pending = null;

      let ast: MdmaRoot;
      if (store) {
        ast = await reparseInto(store, markdown);
      } else {
        const parsed = await parseDocument(markdown);
        store = parsed.store;
        ast = parsed.ast;
        disposers.push(runActionsInMain(store), forwardAudit(store));
      }
      onParsed(ast, store);
    }
    running = null;
  }

  return {
    schedule(markdown) {
      pending = markdown;
      if (!running) running = drain();
      return running;
    },

    dispose() {
      for (const dispose of disposers) dispose();
      disposers.length = 0;
    },
  };
}
