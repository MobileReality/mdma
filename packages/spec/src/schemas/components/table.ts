import { z } from 'zod';
import { ComponentBaseSchema } from '../component-base.js';
import { BindingExpressionSchema } from '../binding.js';

export const TableColumnSchema = z.preprocess(
  (val) => {
    if (typeof val !== 'object' || val === null) return val;
    const obj = val as Record<string, unknown>;
    const result = { ...obj };
    // Normalize common LLM-generated field names
    if ('field' in result && !('key' in result)) {
      result.key = result.field;
      result.field = undefined;
    }
    if ('label' in result && !('header' in result)) {
      result.header = result.label;
      result.label = undefined;
    }
    return result;
  },
  z.object({
    key: z.string().min(1),
    header: z.string().min(1),
    sortable: z.boolean().default(false),
    sensitive: z.boolean().default(false),
    width: z.string().optional(),
  }),
);

export const TableComponentSchema = ComponentBaseSchema.extend({
  type: z.literal('table'),
  columns: z.array(TableColumnSchema).min(1),
  data: z.union([z.array(z.record(z.unknown())), BindingExpressionSchema]),
  sortable: z.boolean().default(false),
  filterable: z.boolean().default(false),
  pageSize: z.number().positive().optional(),
});

export type TableColumn = z.infer<typeof TableColumnSchema>;
export type TableComponent = z.infer<typeof TableComponentSchema>;
