import { z } from 'zod';
import { bindable } from './binding.js';

export const ComponentBaseSchema = z.object({
  id: z.string().min(1).describe('Unique component identifier within the document'),
  type: z.string().min(1).describe('Component type name'),
  label: z.string().optional(),
  sensitive: z.boolean().default(false).describe('If true, values are redacted in logs'),
  disabled: bindable(z.boolean()).default(false),
  visible: bindable(z.boolean()).default(true),
  meta: z.record(z.unknown()).optional(),
});

export type ComponentBase = z.infer<typeof ComponentBaseSchema>;
