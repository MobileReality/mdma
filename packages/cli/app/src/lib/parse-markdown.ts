import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { createDocumentStore, AttachableRegistry, type DocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkMdma, {});

function createRegistry(): AttachableRegistry {
  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);
  return registry;
}

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
  return { ast, store: createDocumentStore(ast, { registry: createRegistry() }) };
}
