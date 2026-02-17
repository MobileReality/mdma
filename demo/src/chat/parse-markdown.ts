import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mdma/parser';
import { createDocumentStore, type DocumentStore } from '@mdma/runtime';
import type { MdmaRoot } from '@mdma/spec';

/** Module-level singleton — initialized once, reused across all parses. */
const processor = unified().use(remarkParse).use(remarkMdma);

/**
 * Parse a markdown string into an MDMA AST and document store.
 * If an existing store is provided, it will be updated incrementally
 * to preserve user-entered state (form values, approvals, etc.).
 */
export async function parseMarkdown(
  markdown: string,
  existingStore?: DocumentStore,
): Promise<{ ast: MdmaRoot; store: DocumentStore }> {
  const tree = processor.parse(markdown);
  const ast = (await processor.run(tree)) as MdmaRoot;
  if (existingStore) {
    existingStore.updateAst(ast);
    return { ast, store: existingStore };
  }
  return { ast, store: createDocumentStore(ast) };
}
