import { extractBindings } from '@mobile-reality/mdma-parser';
import type { ValidationRule } from '../types.js';
import { ACTION_REFERENCE_FIELDS } from '../constants.js';

export const unreferencedComponentsRule: ValidationRule = {
  id: 'unreferenced-components',
  name: 'Unreferenced Components',
  description:
    'Flags components whose ID is never referenced by bindings or action fields in other components',
  defaultSeverity: 'info',

  validate(context) {
    const allIds = new Map<string, number>(); // id → blockIndex
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (typeof block.data.id === 'string') {
        allIds.set(block.data.id, block.index);
      }
    }

    if (allIds.size <= 1) return; // Nothing to check with 0–1 components

    const referencedIds = new Set<string>();

    for (const block of context.blocks) {
      if (block.data === null) continue;

      const blockId = typeof block.data.id === 'string' ? block.data.id : '';

      // Collect binding root segments
      const bindings = extractBindings(blockId, block.data);
      for (const binding of bindings) {
        const rootSegment = binding.path.split('.')[0];
        referencedIds.add(rootSegment);
      }

      // Collect action reference field values
      const type = block.data.type;
      if (typeof type === 'string') {
        const fields = ACTION_REFERENCE_FIELDS[type];
        if (fields) {
          for (const field of fields) {
            const value = block.data[field];
            if (typeof value === 'string') {
              referencedIds.add(value);
            }
          }
        }
      }
    }

    // Find unreferenced components
    for (const [id, blockIndex] of allIds) {
      if (referencedIds.has(id)) continue;

      const block = context.blocks[blockIndex];
      if (!block?.data) continue;

      // Skip thinking blocks (standalone by nature)
      if (block.data.type === 'thinking') continue;

      // Skip the first component (often standalone)
      if (blockIndex === 0) continue;

      context.issues.push({
        ruleId: 'unreferenced-components',
        severity: 'info',
        message: `Component "${id}" is not referenced by any binding or action in the document`,
        componentId: id,
        blockIndex,
        fixed: false,
      });
    }
  },
};
