import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';
import { BindingExpressionSchema } from '../binding.js';

export const WebhookComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('webhook'),
  url: z.union([z.string().url(), BindingExpressionSchema]),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('POST'),
  headers: z.record(z.string()).optional(),
  body: z.union([z.record(z.unknown()), BindingExpressionSchema]).optional(),
  trigger: z.string().describe('Action ID that triggers this webhook'),
  retries: z.number().int().min(0).max(5).default(0),
  timeout: z.number().int().positive().default(30000).describe('Timeout in milliseconds'),
});

export type WebhookComponent = z.infer<typeof WebhookComponentSchema>;
