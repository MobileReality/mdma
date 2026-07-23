import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { remarkMdma } from '@mobile-reality/mdma-parser';
import { AttachableRegistry, createDocumentStore } from '@mobile-reality/mdma-runtime';
import { registerAllCoreAttachables } from '@mobile-reality/mdma-attachables-core';
import type { MdmaRoot } from '@mobile-reality/mdma-spec';

const processor = unified().use(remarkParse).use(remarkGfm).use(remarkMdma, {});

/**
 * Parse markdown into an MDMA AST and a store seeded with the core attachables —
 * the same pipeline the demo and the AG-UI bridge use, so renderer tests run
 * against real component state rather than hand-built fixtures.
 */
export async function parseDoc(
  markdown: string,
): Promise<{ ast: MdmaRoot; store: ReturnType<typeof createDocumentStore> }> {
  const tree = processor.parse(markdown);
  // The raw source is passed to run() so the transform can tell a still-streaming
  // (unterminated) fence from a complete one.
  const ast = (await processor.run(tree, markdown)) as MdmaRoot;
  const registry = new AttachableRegistry();
  registerAllCoreAttachables(registry);
  return { ast, store: createDocumentStore(ast, { registry }) };
}

/** Fenced `mdma` block wrapper — keeps the YAML in tests readable. */
export function mdma(yaml: string): string {
  return ['```mdma', yaml.trim(), '```', ''].join('\n');
}
