import type { ValidationRule } from '../types.js';

const KEBAB_CASE_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const idFormatRule: ValidationRule = {
  id: 'id-format',
  name: 'ID Format',
  description: 'Checks that component IDs follow kebab-case convention',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;
      const id = block.data.id;
      if (typeof id !== 'string') continue;

      if (!KEBAB_CASE_REGEX.test(id)) {
        context.issues.push({
          ruleId: 'id-format',
          severity: 'warning',
          message: `ID "${id}" is not kebab-case. Expected format: "my-component-id"`,
          componentId: id,
          field: 'id',
          blockIndex: block.index,
          fixed: false,
        });
      }
    }
  },
};
