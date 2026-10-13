import type { DataSourceDefinition } from '@mobile-reality/mdma-spec';
import { REGIONS } from './countries-data.js';
import {
  resolveCountries,
  resolveIncidents,
  resolveSalesByMonth,
  resolveSalesRecords,
} from './resolvers.js';
import { STATUSES } from './seeded-incidents.js';

export const DEMO_DATA_SOURCES: readonly DataSourceDefinition[] = [
  {
    name: 'incidents',
    description: 'Operational incidents raised against internal services.',
    kind: 'rows',
    columns: [
      { key: 'id', type: 'string', sensitive: false },
      { key: 'title', type: 'string', sensitive: false },
      { key: 'service', type: 'string', sensitive: false },
      { key: 'severity', type: 'string', sensitive: false },
      { key: 'status', type: 'string', sensitive: false },
      { key: 'opened_at', type: 'date', sensitive: false },
    ],
    params: [
      { name: 'status', type: 'string', required: true, allowed: [...STATUSES] },
      { name: 'service', type: 'string', required: false },
    ],
    resolve: resolveIncidents,
  },
  {
    name: 'countries',
    description: 'ISO countries, usable as select options.',
    kind: 'options',
    params: [{ name: 'region', type: 'string', required: false, allowed: [...REGIONS] }],
    resolve: resolveCountries,
  },
  {
    name: 'sales-by-month',
    description: 'Monthly sales totals for a calendar year, as a chart series.',
    kind: 'series',
    columns: [
      { key: 'month', type: 'string', sensitive: false },
      { key: 'revenue', type: 'number', sensitive: false },
      { key: 'orders', type: 'number', sensitive: false },
    ],
    params: [{ name: 'year', type: 'number', required: true }],
    resolve: resolveSalesByMonth,
  },
  {
    name: 'sales-records',
    description:
      'The same monthly sales totals for a calendar year, as table rows (use it for tables).',
    kind: 'rows',
    columns: [
      { key: 'month', type: 'string', sensitive: false },
      { key: 'revenue', type: 'number', sensitive: false },
      { key: 'orders', type: 'number', sensitive: false },
    ],
    params: [{ name: 'year', type: 'number', required: true }],
    resolve: resolveSalesRecords,
  },
];
