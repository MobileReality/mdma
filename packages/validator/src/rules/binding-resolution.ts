import { extractBindings } from '@mobile-reality/mdma-parser';
import type { ValidationRule } from '../types.js';

export const bindingResolutionRule: ValidationRule = {
  id: 'binding-resolution',
  name: 'Binding Resolution',
  description: 'Checks that binding expressions reference existing components and valid fields',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id = typeof block.data.id === 'string' ? block.data.id : null;

      const bindings = extractBindings(id ?? '', block.data);

      for (const binding of bindings) {
        const segments = binding.path.split('.');
        const rootSegment = segments[0];

        if (!context.idMap.has(rootSegment)) {
          // Check for near-matches (e.g., user_form vs user-form)
          let suggestion = '';
          for (const knownId of context.idMap.keys()) {
            if (normalize(knownId) === normalize(rootSegment)) {
              suggestion = ` (did you mean "${knownId}"?)`;
              break;
            }
          }

          context.issues.push({
            ruleId: 'binding-resolution',
            severity: 'warning',
            message: `Binding "{{${binding.path}}}" in ${binding.field}: component "${rootSegment}" not found in document${suggestion}`,
            componentId: id,
            field: binding.field,
            blockIndex: block.index,
            fixed: false,
          });
          continue;
        }

        // Deep field validation: check sub-path against known component structure
        if (segments.length > 1) {
          const targetBlockIndex = context.idMap.get(rootSegment)!;
          const targetBlock = context.blocks[targetBlockIndex];
          if (!targetBlock?.data) continue;

          const subField = segments[1];
          const targetType = targetBlock.data.type;

          if (targetType === 'form' && Array.isArray(targetBlock.data.fields)) {
            const fieldNames = new Set<string>();
            for (const f of targetBlock.data.fields) {
              if (typeof f === 'object' && f !== null && typeof f.name === 'string') {
                fieldNames.add(f.name);
              }
            }
            if (fieldNames.size > 0 && !fieldNames.has(subField)) {
              context.issues.push({
                ruleId: 'binding-resolution',
                severity: 'info',
                message: `Binding "{{${binding.path}}}" in ${binding.field}: form "${rootSegment}" has no field named "${subField}" (available: ${[...fieldNames].join(', ')})`,
                componentId: id,
                field: binding.field,
                blockIndex: block.index,
                fixed: false,
              });
            }
          } else if (targetType === 'table' && Array.isArray(targetBlock.data.columns)) {
            const columnKeys = new Set<string>();
            for (const col of targetBlock.data.columns) {
              if (typeof col === 'object' && col !== null && typeof col.key === 'string') {
                columnKeys.add(col.key);
              }
            }
            if (columnKeys.size > 0 && !columnKeys.has(subField)) {
              context.issues.push({
                ruleId: 'binding-resolution',
                severity: 'info',
                message: `Binding "{{${binding.path}}}" in ${binding.field}: table "${rootSegment}" has no column named "${subField}" (available: ${[...columnKeys].join(', ')})`,
                componentId: id,
                field: binding.field,
                blockIndex: block.index,
                fixed: false,
              });
            }
          }
        }
      }
    }
  },
};

/** Normalize an ID for fuzzy matching: lowercase, strip hyphens/underscores */
function normalize(id: string): string {
  return id.toLowerCase().replace(/[-_]/g, '');
}
