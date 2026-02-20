import type { ValidationRule } from '../types.js';

/** Fields that reference action IDs, by component type */
const ACTION_FIELDS: Record<string, string[]> = {
  form: ['onSubmit'],
  button: ['onAction'],
  tasklist: ['onComplete'],
  'approval-gate': ['onApprove', 'onDeny'],
  webhook: ['trigger'],
};

export const actionReferencesRule: ValidationRule = {
  id: 'action-references',
  name: 'Action References',
  description:
    'Checks that onSubmit, onAction, trigger, etc. reference valid targets',
  defaultSeverity: 'warning',

  validate(context) {
    // Build set of all known IDs (component IDs)
    const knownIds = new Set(context.idMap.keys());

    // Webhook triggers are valid action targets
    // And component IDs themselves are valid action targets
    // (webhooks reference other components' actions via trigger)

    for (const block of context.blocks) {
      if (block.data === null) continue;
      const type = block.data.type;
      if (typeof type !== 'string') continue;
      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      const fields = ACTION_FIELDS[type];
      if (!fields) continue;

      for (const field of fields) {
        const value = block.data[field];
        if (typeof value !== 'string') continue;

        // For webhook.trigger, the value is the action ID that triggers this webhook.
        // It should reference a valid component action.
        // For other fields, the value should reference a webhook trigger or component ID.
        if (!knownIds.has(value)) {
          let suggestion = '';
          const normalized = value.toLowerCase().replace(/[-_]/g, '');
          for (const knownId of knownIds) {
            if (
              knownId.toLowerCase().replace(/[-_]/g, '') === normalized
            ) {
              suggestion = ` (did you mean "${knownId}"?)`;
              break;
            }
          }

          context.issues.push({
            ruleId: 'action-references',
            severity: 'warning',
            message: `Action reference "${value}" in ${field} does not match any component ID in the document${suggestion}`,
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
