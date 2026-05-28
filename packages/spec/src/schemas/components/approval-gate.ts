import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const ApprovalGateComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('approval-gate'),
  title: z.string().min(1),
  description: z.string().optional(),
  requiredApprovers: z
    .number()
    .int()
    .positive()
    .default(1)
    .describe(
      'Advisory only — not enforced by the MDMA runtime, regardless of value (including the ' +
        'default of 1). The host application is responsible for tracking distinct approvers. ' +
        'See docs/reference/component-catalog.md#approval-gate for the security model.',
    ),
  allowedRoles: z
    .array(z.string())
    .optional()
    .describe(
      'Advisory list of approver roles surfaced to the host UI — not enforced by the MDMA ' +
        'runtime. The host application is responsible for verifying actor identity and role membership.',
    ),
  onApprove: z.string().optional().describe('Action ID dispatched on approval'),
  onDeny: z.string().optional().describe('Action ID dispatched on denial'),
  requireReason: z
    .boolean()
    .default(false)
    .describe(
      'Advisory only — surfaces a reason input on denial; the MDMA runtime does not block ' +
        'dispatch when a reason is omitted. Enforcement is the host application’s responsibility.',
    ),
});

export type ApprovalGateComponent = z.infer<typeof ApprovalGateComponentSchema>;
