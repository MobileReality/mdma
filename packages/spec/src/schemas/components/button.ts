import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';

export const ButtonComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('button'),
  text: z.string().min(1),
  variant: z.enum(['primary', 'secondary', 'danger', 'ghost']).default('primary'),
  onAction: z.string().describe('Action ID to trigger on click').optional(),
  confirm: z
    .object({
      title: z.string(),
      message: z.string(),
      confirmText: z.string().default('Confirm'),
      cancelText: z.string().default('Cancel'),
    })
    .optional(),
});

export type ButtonComponent = z.infer<typeof ButtonComponentSchema>;
