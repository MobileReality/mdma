import { parseYaml } from '@mobile-reality/mdma-parser';
import type { ParsedBlock } from './types.js';

const MDMA_BLOCK_REGEX = /```mdma\n([\s\S]*?)```/g;

/**
 * Strip YAML document separators (`---`) that LLMs sometimes insert.
 * Removes lines that are exactly `---` (with optional whitespace).
 */
function sanitizeYamlSeparators(yaml: string): string {
  return yaml
    .split('\n')
    .filter((line) => !/^\s*---\s*$/.test(line))
    .join('\n');
}

/**
 * Split YAML content that contains multiple components into separate chunks.
 * LLMs sometimes put two or more components (each with `type:`) in one block.
 *
 * Returns null if content doesn't look like multiple components.
 */
function splitMultiComponent(yaml: string): string[] | null {
  const lines = yaml.split('\n');
  // Find all root-level `type:` lines (no indentation)
  const typeLineIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^type:\s/.test(lines[i])) {
      typeLineIndices.push(i);
    }
  }

  // Only split if there are multiple root-level type: lines
  if (typeLineIndices.length < 2) return null;

  const chunks: string[] = [];
  for (let i = 0; i < typeLineIndices.length; i++) {
    const start = typeLineIndices[i];
    const end = i + 1 < typeLineIndices.length ? typeLineIndices[i + 1] : lines.length;
    const chunk = lines.slice(start, end).join('\n').trimEnd();
    if (chunk) chunks.push(chunk);
  }

  return chunks.length >= 2 ? chunks : null;
}

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

    // Try parsing raw first; if it fails, try stripping YAML separators
    let parseResult = parseYaml(yamlContent.trimEnd());
    let sanitized = false;

    if (!parseResult.ok) {
      const cleaned = sanitizeYamlSeparators(yamlContent).trimEnd();
      const retryResult = parseYaml(cleaned);
      if (retryResult.ok) {
        parseResult = retryResult;
        sanitized = true;
      }
    }

    // If still failing, try splitting multi-component block
    if (!parseResult.ok) {
      const cleaned = sanitizeYamlSeparators(yamlContent).trimEnd();
      const chunks = splitMultiComponent(cleaned);
      if (chunks) {
        const sourceIndex = index;
        for (const chunk of chunks) {
          const chunkResult = parseYaml(chunk);
          blocks.push({
            index,
            rawYaml: chunk,
            data: chunkResult.ok ? chunkResult.data : null,
            startOffset,
            endOffset,
            yamlStartOffset,
            yamlEndOffset,
            parseError: chunkResult.ok ? undefined : chunkResult.error.message,
            yamlSanitized: true,
            splitFrom: sourceIndex,
          });
          index++;
        }
        continue;
      }
    }

    blocks.push({
      index,
      rawYaml: yamlContent,
      data: parseResult.ok ? parseResult.data : null,
      startOffset,
      endOffset,
      yamlStartOffset,
      yamlEndOffset,
      parseError: parseResult.ok ? undefined : parseResult.error.message,
      yamlSanitized: sanitized,
    });

    index++;
  }

  return blocks;
}
