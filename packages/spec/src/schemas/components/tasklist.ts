import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';
import { BindingExpressionSchema } from '../binding.js';

export const TaskItemSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  checked: z.boolean().default(false),
  required: z.boolean().default(false),
  bind: BindingExpressionSchema.optional(),
});

export const TasklistComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('tasklist'),
  items: z.array(TaskItemSchema).min(1),
  onComplete: z.string().optional().describe('Action ID triggered when all items are checked'),
});

export type TaskItem = z.infer<typeof TaskItemSchema>;
export type TasklistComponent = z.infer<typeof TasklistComponentSchema>;
