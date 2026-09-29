import fs from 'node:fs';
import { DataSourceDescriptorSchema } from '@mobile-reality/mdma-spec';
import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';

export function parseDataSources(json: string): DataSourceDescriptor[] {
  return DataSourceDescriptorSchema.array().parse(JSON.parse(json));
}

export function loadDataSources(file: string): DataSourceDescriptor[] {
  return parseDataSources(fs.readFileSync(file, 'utf-8'));
}

export function toCatalog(sources: DataSourceDescriptor[]): Record<string, DataSourceDescriptor> {
  return Object.fromEntries(sources.map((source) => [source.name, source]));
}
