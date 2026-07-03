import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import {
  createDocumentStore,
  AttachableRegistry,
  type DocumentStore,
} from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkMdma, {});

/** Build a registry with the core attachables (form/button/approval-gate/…) registered. */
export function createDefaultRegistry(): AttachableRegistry {
  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);
  return registry;
}

/**
 * Parse a markdown string into an MDMA AST and either seed a fresh document store or, when an
 * `existingStore` is passed, update it in place via `store.updateAst()` — preserving in-flight
 * form values, focus, and audit log across streamed re-parses. Mirrors the CLI preview pipeline.
 */
export async function parseMdma(
  markdown: string,
  options: {
    existingStore?: DocumentStore;
    createRegistry?: () => AttachableRegistry;
    /** Seed fresh component values (e.g. restoring a persisted conversation from a backend). */
    initialState?: Record<string, Record<string, unknown>>;
  } = {},
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const tree = processor.parse(markdown);
  // Pass the source to run() so the mdma transform can see the raw fences — it needs them to tell a
  // still-streaming (unterminated) block from a complete one and avoid flashing "Unknown component".
  const ast = (await processor.run(tree, markdown)) as MdmaRoot;
  if (options.existingStore) {
    options.existingStore.updateAst(ast);
    return { ast, store: options.existingStore };
  }
  const createRegistry = options.createRegistry ?? createDefaultRegistry;
  return {
    ast,
    store: createDocumentStore(ast, {
      registry: createRegistry(),
      initialState: options.initialState,
    }),
  };
}
