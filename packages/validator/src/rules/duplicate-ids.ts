import type { ValidationRule } from '../types.js';

export const duplicateIdsRule: ValidationRule = {
  id: 'duplicate-ids',
  name: 'Duplicate IDs',
  description: 'Checks that all component IDs are unique within the document',
  defaultSeverity: 'error',

  validate(context) {
    const seen = new Map<string, number>(); // id -> first block index

    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id = block.data.id;
      if (typeof id !== 'string') continue;

      const firstIndex = seen.get(id);
      if (firstIndex !== undefined) {
        context.issues.push({
          ruleId: 'duplicate-ids',
          severity: 'error',
          message: `Duplicate component ID: "${id}" (first seen in block ${firstIndex})`,
          componentId: id,
          field: 'id',
          blockIndex: block.index,
          fixed: false,
        });
      } else {
        seen.set(id, block.index);
      }
    }
  },
};
