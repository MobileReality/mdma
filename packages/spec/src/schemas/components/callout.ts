import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const CalloutComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('callout'),
  variant: z.enum(['info', 'warning', 'error', 'success']).default('info'),
  title: z.string().optional(),
  content: z.string().min(1),
  dismissible: z.boolean().default(false),
});

export type CalloutComponent = z.infer<typeof CalloutComponentSchema>;
