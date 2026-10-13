import type { DocumentStoreOptions } from '@mobile-reality/mdma-runtime';
import type { DataSourceDefinition } from '@mobile-reality/mdma-spec';
import { DEMO_DATA_SOURCES } from '../data-sources/catalog.js';
import type { AnthropicConfig } from './anthropic-client.js';

type DataSourceConfig = Pick<AnthropicConfig, 'externalDataSources'>;

export function dataSourcesFor(
  config: DataSourceConfig,
): readonly DataSourceDefinition[] | undefined {
  return config.externalDataSources ? DEMO_DATA_SOURCES : undefined;
}

export function storeOptionsFor(config: DataSourceConfig): DocumentStoreOptions | undefined {
  const dataSources = dataSourcesFor(config);
  return dataSources ? { dataSources } : undefined;
}
