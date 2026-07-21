import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma, type RemarkMdmaOptions } from '@mobile-reality/mdma-parser';
import { createDocumentStore, type DocumentStore } from '@mobile-reality/mdma-runtime';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

/**
 * Create a markdown-to-MDMA parser, optionally configured with custom
 * component schemas so the parser accepts user-defined component types.
 *
 * Returns a `parseMarkdown` function that reuses a single unified processor.
 */
export function createParser(options?: RemarkMdmaOptions) {
  // remark-gfm is required for GitHub-flavoured Markdown around the mdma
  // blocks. Models routinely emit pipe tables (e.g. an "accessible data table"
  // next to a chart); without gfm those never become `table` nodes and render
  // as a run-on paragraph of pipes. MdastRenderer already knows how to render
  // table/tableRow/tableCell — only the parse step was missing.
  // It also enables strikethrough, task-list items, and autolinks.
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
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
