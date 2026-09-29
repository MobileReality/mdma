import { z } from 'zod';

export const DataSourceParamValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const DataSourceRefSchema = z.object({
  source: z.string().min(1),
  params: z.record(DataSourceParamValueSchema).optional(),
});

export type DataSourceParamValue = z.infer<typeof DataSourceParamValueSchema>;
export type DataSourceRef = z.infer<typeof DataSourceRefSchema>;

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

export type DataSourceSortDirection = 'asc' | 'desc';

export interface DataSourceSort {
  key: string;
  direction: DataSourceSortDirection;
}

export interface DataSourceRequest {
  source: string;
  params: Record<string, unknown>;
  page?: number;
  pageSize?: number;
  sort?: DataSourceSort;
  filter?: string;
}

export interface DataSourceResult<TRow = unknown> {
  rows: TRow[];
  total?: number;
}

export type DataSourceResolver = (
  request: DataSourceRequest,
  ctx: { signal: AbortSignal },
) => Promise<DataSourceResult>;

export interface DataSourceDefinition extends DataSourceDescriptor {
  resolve?: unknown[] | DataSourceResolver;
}

export function defineDataSource<const T extends DataSourceDefinition>(definition: T): T {
  return definition;
}

export function indexDataSources<T extends DataSourceDescriptor>(
  definitions: readonly T[],
): Record<string, T> {
  const index: Record<string, T> = {};
  for (const definition of definitions) {
    if (Object.hasOwn(index, definition.name)) {
      throw new Error(`Duplicate data source name "${definition.name}"`);
    }
    index[definition.name] = definition;
  }
  return index;
}
