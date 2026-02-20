import { stringify } from 'yaml';
import type { ParsedBlock } from './types.js';

export function reserializeBlock(data: Record<string, unknown>): string {
  return stringify(data, {
    lineWidth: 0,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
  }).trimEnd();
}

export function reconstructMarkdown(
  originalMarkdown: string,
  blocks: ParsedBlock[],
): string {
  let result = originalMarkdown;

  // Process blocks in reverse order so offsets remain valid
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block.data === null) continue;

    const newYaml = reserializeBlock(block.data) + '\n';
    result =
      result.slice(0, block.yamlStartOffset) +
      newYaml +
      result.slice(block.yamlEndOffset);
  }

  return result;
}
