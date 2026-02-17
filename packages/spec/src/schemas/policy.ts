import { z } from 'zod';

export const PolicyRuleSchema = z.object({
  action: z.string().describe('Action type to control'),
  environments: z.array(z.string()).describe('Environments where this rule applies'),
  effect: z.enum(['allow', 'deny']),
  reason: z.string().optional(),
});

export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicySchema = z.object({
  version: z.literal(1),
  rules: z.array(PolicyRuleSchema),
  defaultEffect: z.enum(['allow', 'deny']).default('deny'),
});

export type Policy = z.infer<typeof PolicySchema>;
