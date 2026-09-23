import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

export async function parseMarkdown(markdown: string): Promise<MdmaRoot> {
  const tree = processor.parse(markdown);
  // The raw source goes to run() so the transform can tell a still-streaming
  // (unterminated) fence from a complete one.
  return (await processor.run(tree, markdown)) as MdmaRoot;
}

export async function parseDocument(
  markdown: string,
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const ast = await parseMarkdown(markdown);
  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);
  return { ast, store: createDocumentStore(ast, { registry, environment: 'preview' }) };
}

/**
 * Fold a growing Markdown string into an existing store, so a streamed reply
 * renders live without losing values the user has already typed.
 */
export async function reparseInto(store: DocumentStore, markdown: string): Promise<MdmaRoot> {
  const ast = await parseMarkdown(markdown);
  store.updateAst(ast);
  return ast;
}
