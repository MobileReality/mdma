/**
 * Maps component types to their fields that are cross-references to other component IDs.
 * Used by action-references rule, unreferenced-components rule, flow-ordering rule,
 * and the action-references fix.
 */
export const ACTION_REFERENCE_FIELDS: Record<string, string[]> = {
  form: ['onSubmit'],
  button: ['onAction'],
  tasklist: ['onComplete'],
  'approval-gate': ['onApprove', 'onDeny'],
  webhook: ['trigger'],
};

/** Flat list of all action reference field names (for id-format fix updates). */
export const ACTION_FIELD_NAMES: string[] = [
  ...new Set(Object.values(ACTION_REFERENCE_FIELDS).flat()),
];
