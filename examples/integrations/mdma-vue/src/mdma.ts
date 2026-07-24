import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

/** Parse a Markdown string into an MDMA AST. */
export async function parseMarkdown(markdown: string): Promise<MdmaRoot> {
  const tree = processor.parse(markdown);
  // The raw source is passed to run() so the transform can tell a still-streaming
  // (unterminated) fence from a complete one — which is exactly the case while an
  // assistant message is mid-stream.
  return (await processor.run(tree, markdown)) as MdmaRoot;
}

/**
 * Parse a Markdown string into an MDMA AST and a store seeded with the core
 * attachables — the same pipeline the demo and the AG-UI bridge use. The store
 * owns component values, binding resolution, policy, and the audit log; the
 * renderer only draws it and dispatches actions back in.
 */
export async function parseDocument(
  markdown: string,
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const ast = await parseMarkdown(markdown);
  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);
  return { ast, store: createDocumentStore(ast, { registry }) };
}

/**
 * Re-parse a (growing) Markdown string and fold it into an existing store via
 * `updateAst`, preserving any values the user has already entered. This is what
 * makes a streamed assistant message render its components live without losing
 * in-progress form input on each new chunk.
 */
export async function reparseInto(store: DocumentStore, markdown: string): Promise<MdmaRoot> {
  const ast = await parseMarkdown(markdown);
  store.updateAst(ast);
  return ast;
}
