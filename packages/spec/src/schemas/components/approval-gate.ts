import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const ApprovalGateComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('approval-gate'),
  title: z.string().min(1),
  description: z.string().optional(),
  requiredApprovers: z.number().int().positive().default(1),
  allowedRoles: z.array(z.string()).optional(),
  onApprove: z.string().optional().describe('Action ID triggered on approval'),
  onDeny: z.string().optional().describe('Action ID triggered on denial'),
  requireReason: z.boolean().default(false).describe('Require reason on denial'),
});

export type ApprovalGateComponent = z.infer<typeof ApprovalGateComponentSchema>;
