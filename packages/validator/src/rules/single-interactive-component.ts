import type { ValidationRule } from '../types.js';

const INTERACTIVE_TYPES = new Set(['form', 'button', 'webhook', 'approval-gate', 'tasklist']);

export const singleInteractiveComponentRule: ValidationRule = {
  id: 'single-interactive-component',
  name: 'Single Interactive Component',
  description: 'Warns when a document contains more than one interactive component per message',
  defaultSeverity: 'warning',

  validate(context) {
    const interactive = context.blocks.filter(
      (b) => b.data !== null && INTERACTIVE_TYPES.has(b.data.type as string),
    );

    if (interactive.length <= 1) return;

    const types = interactive.map((b) => `${b.data!.type}#${b.data!.id}`).join(', ');

    context.issues.push({
      ruleId: 'single-interactive-component',
      severity: 'warning',
      message: `Document contains ${interactive.length} interactive components (${types}) — use at most one interactive component per message`,
      componentId: null,
      blockIndex: -1,
      fixed: false,
    });
  },
};
