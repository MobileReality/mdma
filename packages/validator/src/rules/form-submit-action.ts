import type { ValidationRule } from '../types.js';

export const formSubmitActionRule: ValidationRule = {
  id: 'form-submit-action',
  name: 'Form Submit Action',
  description: 'Checks that every type: form component has a non-empty onSubmit action',
  defaultSeverity: 'error',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      if (block.data.type !== 'form') continue;

      const id = typeof block.data.id === 'string' ? block.data.id : null;
      const onSubmit = block.data.onSubmit;

      if (!onSubmit || typeof onSubmit !== 'string' || onSubmit.trim() === '') {
        context.issues.push({
          ruleId: 'form-submit-action',
          severity: 'error',
          message: 'Form must have an onSubmit action',
          componentId: id,
          field: 'onSubmit',
          blockIndex: block.index,
          fixed: false,
        });
      }
    }
  },
};
