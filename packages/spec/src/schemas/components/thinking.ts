import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const ThinkingComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('thinking'),
  content: z.string().min(1),
  status: z.enum(['thinking', 'done']).default('done'),
  collapsed: z.boolean().default(true),
});

export type ThinkingComponent = z.infer<typeof ThinkingComponentSchema>;
