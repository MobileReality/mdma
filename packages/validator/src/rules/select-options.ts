import type { ValidationRule } from '../types.js';

export const selectOptionsRule: ValidationRule = {
  id: 'select-options',
  name: 'Select Options',
  description:
    'Checks that form fields with type "select" have options defined',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (block.data.type !== 'form') continue;

      const fields = block.data.fields;
      if (!Array.isArray(fields)) continue;

      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        if (typeof field !== 'object' || field === null) continue;
        if (field.type !== 'select') continue;

        const name = typeof field.name === 'string' ? field.name : `fields[${i}]`;

        if (field.options == null) {
          context.issues.push({
            ruleId: 'select-options',
            severity: 'warning',
            message: `Select field "${name}" is missing options`,
            componentId: id,
            field: `fields[${i}]`,
            blockIndex: block.index,
            fixed: false,
          });
          continue;
        }

        // Skip binding expressions (strings are valid as binding refs)
        if (typeof field.options === 'string') continue;

        if (Array.isArray(field.options)) {
          for (let j = 0; j < field.options.length; j++) {
            const opt = field.options[j];
            if (typeof opt !== 'object' || opt === null) continue;
            if (typeof opt.label !== 'string' || typeof opt.value !== 'string') {
              context.issues.push({
                ruleId: 'select-options',
                severity: 'warning',
                message: `Select field "${name}" has malformed option at index ${j} (expected {label, value})`,
                componentId: id,
                field: `fields[${i}].options[${j}]`,
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
