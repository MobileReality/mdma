import type { FixContext } from '../types.js';

export function fixSensitiveFlags(context: FixContext): void {
  for (const issue of context.issues) {
    if (issue.ruleId !== 'sensitive-flags' || issue.fixed) continue;

    const block = context.blocks[issue.blockIndex];
    if (!block?.data) continue;

    const fieldPath = issue.field;
    if (!fieldPath) continue;

    // Parse field path like "fields[2]" or "columns[0]"
    const match = fieldPath.match(/^(fields|columns)\[(\d+)\]$/);
    if (!match) continue;

    const [, arrayName, indexStr] = match;
    const index = Number.parseInt(indexStr, 10);
    const array = block.data[arrayName];

    if (!Array.isArray(array) || index >= array.length) continue;

    const item = array[index] as Record<string, unknown>;
    if (!item || typeof item !== 'object') continue;

    item.sensitive = true;
    issue.fixed = true;
  }
}
