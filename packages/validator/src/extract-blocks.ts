import { parseYaml } from '@mdma/parser';
import type { ParsedBlock } from './types.js';

const MDMA_BLOCK_REGEX = /```mdma\n([\s\S]*?)```/g;

export function extractMdmaBlocksFromMarkdown(
  markdown: string,
): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let match: RegExpExecArray | null;
  let index = 0;

  // Reset regex state
  MDMA_BLOCK_REGEX.lastIndex = 0;

  while ((match = MDMA_BLOCK_REGEX.exec(markdown)) !== null) {
    const fullMatch = match[0];
    const yamlContent = match[1];
    const startOffset = match.index;
    const endOffset = match.index + fullMatch.length;
    const yamlStartOffset = match.index + '```mdma\n'.length;
    const yamlEndOffset = endOffset - '```'.length;

    const parseResult = parseYaml(yamlContent.trimEnd());

    blocks.push({
      index,
      rawYaml: yamlContent,
      data: parseResult.ok ? parseResult.data : null,
      startOffset,
      endOffset,
      yamlStartOffset,
      yamlEndOffset,
      parseError: parseResult.ok ? undefined : parseResult.error.message,
    });

    index++;
  }

  return blocks;
}
