import type { ValidationRule } from '../types.js';
import { ACTION_REFERENCE_FIELDS } from '../constants.js';

export const actionReferencesRule: ValidationRule = {
  id: 'action-references',
  name: 'Action References',
  description:
    'Checks that action and cross-reference fields (onSubmit, onAction, onComplete, onApprove, onDeny, trigger) reference valid component IDs',
  defaultSeverity: 'warning',

  validate(context) {
    const knownIds = new Set(context.idMap.keys());

    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      if (typeof type !== 'string') continue;
      const id = typeof block.data.id === 'string' ? block.data.id : null;

      const fields = ACTION_REFERENCE_FIELDS[type];
      if (!fields) continue;

      for (const field of fields) {
        const value = block.data[field];
        if (typeof value !== 'string') continue;

        if (!knownIds.has(value)) {
          let suggestion = '';
          const normalized = value.toLowerCase().replace(/[-_]/g, '');
          for (const knownId of knownIds) {
            if (knownId.toLowerCase().replace(/[-_]/g, '') === normalized) {
              suggestion = ` (did you mean "${knownId}"?)`;
              break;
            }
          }

          context.issues.push({
            ruleId: 'action-references',
            severity: 'warning',
            message: `Cross-reference "${value}" in ${field} does not match any component ID in the document${suggestion}`,
            componentId: id,
            field,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
