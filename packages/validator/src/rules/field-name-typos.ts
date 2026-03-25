import type { ValidationRule } from '../types.js';

/**
 * Known field name typos per component type.
 * Maps incorrect field name → correct field name.
 */
const TYPO_MAP: Record<string, Record<string, string>> = {
  'approval-gate': {
    roles: 'allowedRoles',
    role: 'allowedRoles',
    approvers: 'requiredApprovers',
  },
  table: {
    field: 'key',
    label: 'header',
  },
  form: {
    submit: 'onSubmit',
    action: 'onAction',
  },
  button: {
    action: 'onAction',
    click: 'onAction',
    onClick: 'onAction',
  },
};

export const fieldNameTyposRule: ValidationRule = {
  id: 'field-name-typos',
  name: 'Field Name Typos',
  description:
    'Detects common field name mistakes in component definitions (e.g. "roles" instead of "allowedRoles")',
  defaultSeverity: 'warning',

  validate(context) {
    for (const block of context.blocks) {
      if (block.data === null) continue;

      const type = block.data.type;
      if (typeof type !== 'string') continue;

      const typos = TYPO_MAP[type];
      if (!typos) continue;

      const id =
        typeof block.data.id === 'string' ? block.data.id : null;

      for (const [wrong, correct] of Object.entries(typos)) {
        if (wrong in block.data) {
          context.issues.push({
            ruleId: 'field-name-typos',
            severity: 'warning',
            message: `Field "${wrong}" is likely a typo — did you mean "${correct}"?`,
            componentId: id,
            field: wrong,
            blockIndex: block.index,
            fixed: false,
          });
        }
      }
    }
  },
};
