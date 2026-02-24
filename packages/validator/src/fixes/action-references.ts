import type { FixContext } from '../types.js';

/**
 * Only webhook.trigger is a true cross-reference that can be invalid.
 * Remove invalid trigger references from webhooks.
 */
const CROSS_REFERENCE_FIELDS: Record<string, string[]> = {
  webhook: ['trigger'],
};

export function fixActionReferences(context: FixContext): void {
  for (const issue of context.issues) {
    if (issue.ruleId !== 'action-references' || issue.fixed) continue;

    const block = context.blocks[issue.blockIndex];
    if (!block?.data) continue;

    const field = issue.field;
    if (!field) continue;

    const type = block.data.type;
    if (typeof type !== 'string') continue;

    const fields = CROSS_REFERENCE_FIELDS[type];
    if (!fields || !fields.includes(field)) continue;

    // Remove the invalid cross-reference field
    delete block.data[field];
    issue.fixed = true;
  }
}
