import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

/**
 * Parse a Markdown string into an MDMA AST and a store seeded with the core
 * attachables — the same pipeline the demo and the AG-UI bridge use. The store
 * owns component values, binding resolution, policy, and the audit log; the
 * renderer only draws it and dispatches actions back in.
 */
export async function parseDocument(
  markdown: string,
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const tree = processor.parse(markdown);
  // The raw source is passed to run() so the transform can tell a still-streaming
  // (unterminated) fence from a complete one.
  const ast = (await processor.run(tree, markdown)) as MdmaRoot;

  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);

  return { ast, store: createDocumentStore(ast, { registry }) };
}
