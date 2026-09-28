import { z } from 'zod';

export const DataSourceParamValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const DataSourceRefSchema = z.object({
  source: z.string().min(1),
  params: z.record(DataSourceParamValueSchema).optional(),
});

export type DataSourceParamValue = z.infer<typeof DataSourceParamValueSchema>;
export type DataSourceRef = z.infer<typeof DataSourceRefSchema>;

/** Narrows a `table.data`/`chart.data`/`field.options` value to a `{ source, params? }` ref —
 *  the one shape every renderer and the runtime store need to detect the same way. */
export function isDataSourceRef(value: unknown): value is DataSourceRef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).source === 'string'
  );
}

export const DataSourceColumnDescriptorSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'date']),
  description: z.string().optional(),
  sensitive: z.boolean().default(false),
});

export const DataSourceParamDescriptorSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean']),
  required: z.boolean().default(false),
  allowed: z.array(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const DataSourceDescriptorSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  kind: z.enum(['options', 'rows', 'series']),
  columns: z.array(DataSourceColumnDescriptorSchema).optional(),
  params: z.array(DataSourceParamDescriptorSchema).optional(),
});

export type DataSourceColumnDescriptor = z.infer<typeof DataSourceColumnDescriptorSchema>;
export type DataSourceParamDescriptor = z.infer<typeof DataSourceParamDescriptorSchema>;
export type DataSourceDescriptor = z.infer<typeof DataSourceDescriptorSchema>;
