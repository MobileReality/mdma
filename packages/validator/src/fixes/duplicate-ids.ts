import type { FixContext } from '../types.js';

export function fixDuplicateIds(context: FixContext): void {
  const idCounts = new Map<string, number>(); // id -> next suffix number

  for (const issue of context.issues) {
    if (issue.ruleId !== 'duplicate-ids' || issue.fixed) continue;

    const block = context.blocks[issue.blockIndex];
    if (!block?.data) continue;

    const oldId = String(block.data.id);

    // Determine next available suffix
    let count = idCounts.get(oldId) ?? 1;
    count++;
    idCounts.set(oldId, count);

    const newId = `${oldId}-${count}`;
    block.data.id = newId;
    issue.fixed = true;
  }
}
