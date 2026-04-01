import { stringify } from 'yaml';
import type { ParsedBlock } from './types.js';

export function reserializeBlock(data: Record<string, unknown>): string {
  return stringify(data, {
    lineWidth: 0,
    defaultKeyType: 'PLAIN',
    defaultStringType: 'PLAIN',
  }).trimEnd();
}

export function reconstructMarkdown(originalMarkdown: string, blocks: ParsedBlock[]): string {
  let result = originalMarkdown;

  // Group blocks by their source offsets.
  // Split blocks share the same startOffset/endOffset — they need to be
  // combined into multiple fenced blocks replacing the original single one.
  interface Replacement {
    startOffset: number;
    endOffset: number;
    blocks: ParsedBlock[];
  }

  const replacements = new Map<string, Replacement>();

  for (const block of blocks) {
    const key = `${block.startOffset}:${block.endOffset}`;
    let rep = replacements.get(key);
    if (!rep) {
      rep = { startOffset: block.startOffset, endOffset: block.endOffset, blocks: [] };
      replacements.set(key, rep);
    }
    rep.blocks.push(block);
  }

  // Process replacements in reverse offset order so earlier offsets stay valid
  const sorted = Array.from(replacements.values()).sort((a, b) => b.startOffset - a.startOffset);

  for (const rep of sorted) {
    // Skip if all blocks in this group have null data (unparseable)
    if (rep.blocks.every((b) => b.data === null)) continue;

    const parts: string[] = [];
    for (const block of rep.blocks) {
      if (block.data === null) continue;
      const yaml = reserializeBlock(block.data);
      parts.push(`\`\`\`mdma\n${yaml}\n\`\`\``);
    }

    if (parts.length > 0) {
      result = result.slice(0, rep.startOffset) + parts.join('\n\n') + result.slice(rep.endOffset);
    }
  }

  return result;
}
