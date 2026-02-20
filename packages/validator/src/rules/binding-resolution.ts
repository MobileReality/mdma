import { extractBindings } from '@mdma/parser';
import type { ValidationRule } from '../types.js';

export const bindingResolutionRule: ValidationRule = {
  id: 'binding-resolution',
  name: 'Binding Resolution',
  description:
    'Checks that binding expressions reference existing components in the document',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      const bindings = extractBindings(id ?? '', block.data);

      for (const binding of bindings) {
        // The root segment of the path should reference a known component ID
        const rootSegment = binding.path.split('.')[0];

        if (!context.idMap.has(rootSegment)) {
          // Check for near-matches (e.g., user_form vs user-form)
          let suggestion = '';
          for (const knownId of context.idMap.keys()) {
            if (
              normalize(knownId) === normalize(rootSegment)
            ) {
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
        }
      }
    }
  },
};

/** Normalize an ID for fuzzy matching: lowercase, strip hyphens/underscores */
function normalize(id: string): string {
  return id.toLowerCase().replace(/[-_]/g, '');
}
