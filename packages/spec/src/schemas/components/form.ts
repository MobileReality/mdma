import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';
import { BindingExpressionSchema } from '../binding.js';

export const FormFieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['text', 'number', 'email', 'date', 'select', 'checkbox', 'textarea', 'file']),
  label: z.string(),
  required: z.boolean().default(false),
  sensitive: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  options: z.preprocess((val) => {
    if (!Array.isArray(val)) return val;
    return val.map((item) => (typeof item === 'string' ? { label: item, value: item } : item));
  }, z
    .union([z.array(z.object({ label: z.string(), value: z.string() })), z.string().min(1)])
    .optional()),
  validation: z
    .object({
      pattern: z.string().optional(),
      min: z.number().optional(),
      max: z.number().optional(),
      message: z.string().optional(),
    })
    .optional(),
  bind: BindingExpressionSchema.optional(),
});

export const FormComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('form'),
  fields: z.array(FormFieldSchema).min(1),
  onSubmit: z.string().optional().describe('Action ID to trigger on submit'),
});

export type FormField = z.infer<typeof FormFieldSchema>;
export type FormComponent = z.infer<typeof FormComponentSchema>;
