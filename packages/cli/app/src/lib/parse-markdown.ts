import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore, type DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkMdma, {});

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
