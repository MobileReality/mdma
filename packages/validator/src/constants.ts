/**
 * Maps component types to their action-label fields (opaque handler IDs
 * dispatched by the host application at runtime, not document-internal
 * cross-references). Used by `flow-ordering` for cycle/forward-ref checks
 * when the value happens to match an in-doc ID, and by `id-format` to
 * update action-label values when a referenced component's ID gets
 * normalized.
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
