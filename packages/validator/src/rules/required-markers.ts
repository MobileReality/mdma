import type { ValidationRule } from '../types.js';

/** Field names/types that heuristically suggest the field should be required */
const LIKELY_REQUIRED_NAMES = /^(name|full.?name|email|title|summary)$/i;

export const requiredMarkersRule: ValidationRule = {
  id: 'required-markers',
  name: 'Required Markers',
  description: 'Suggests form fields that heuristically look required but are not marked as such',
  defaultSeverity: 'info',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (block.data.type !== 'form') continue;
      if (!Array.isArray(block.data.fields)) continue;

      const id = typeof block.data.id === 'string' ? block.data.id : null;

      for (let i = 0; i < block.data.fields.length; i++) {
        const field = block.data.fields[i] as Record<string, unknown>;
        if (!field || typeof field !== 'object') continue;
        if (field.required === true) continue;

        const name = String(field.name ?? '');
        const label = String(field.label ?? '');
        const fieldType = String(field.type ?? '');

        const shouldBeRequired =
          LIKELY_REQUIRED_NAMES.test(name) ||
          LIKELY_REQUIRED_NAMES.test(label) ||
          fieldType === 'email';

        if (shouldBeRequired) {
          context.issues.push({
            ruleId: 'required-markers',
            severity: 'info',
            message: `Form field "${name}" likely should be marked required: true`,
            componentId: id,
            field: `fields[${i}]`,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
