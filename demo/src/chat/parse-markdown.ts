import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkMdma, type RemarkMdmaOptions } from '@mdma/parser';
import { createDocumentStore, type DocumentStore } from '@mdma/runtime';
import type { MdmaRoot } from '@mdma/spec';

/**
 * Create a markdown-to-MDMA parser, optionally configured with custom
 * component schemas so the parser accepts user-defined component types.
 *
 * Returns a `parseMarkdown` function that reuses a single unified processor.
 */
export function createParser(options?: RemarkMdmaOptions) {
  const processor = unified()
    .use(remarkParse)
    .use(remarkMdma, options ?? {});

  return async function parseMarkdown(
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
  };
}

/** Default parser with no custom schemas — reused across all parses. */
export const parseMarkdown = createParser();
