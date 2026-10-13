import { describe, it, expect } from 'vitest';
import {
  FormComponentSchema,
  TableComponentSchema,
  ChartComponentSchema,
  DataSourceRefSchema,
  DataSourceDescriptorSchema,
} from '../src/index.js';

describe('DataSourceRefSchema', () => {
  it('accepts a source name with no params', () => {
    expect(DataSourceRefSchema.parse({ source: 'accounts' })).toEqual({ source: 'accounts' });
  });

  it('accepts literal and binding params', () => {
    const ref = { source: 'accounts', params: { service: 'billing', region: '{{filters.region}}' } };
    expect(DataSourceRefSchema.parse(ref)).toEqual(ref);
  });

  it('rejects an empty source', () => {
    expect(() => DataSourceRefSchema.parse({ source: '' })).toThrow();
  });
});

describe('DataSourceDescriptorSchema', () => {
  it('accepts a full descriptor', () => {
    const descriptor = {
      name: 'accounts',
      description: 'Account rows',
      kind: 'rows' as const,
      columns: [{ key: 'id', type: 'string' as const, sensitive: false }],
      params: [{ name: 'service', type: 'string' as const, required: true }],
    };
    expect(DataSourceDescriptorSchema.parse(descriptor).kind).toBe('rows');
  });
});

describe('form select options as a data source ref', () => {
  it('accepts { source, params } for a select field', () => {
    const form = {
      id: 'f',
      type: 'form',
      fields: [
        {
          name: 'country',
          type: 'select',
          label: 'Country',
          options: { source: 'countries', params: { region: '{{filters.region}}' } },
        },
      ],
      onSubmit: 'submit',
    };
    const result = FormComponentSchema.parse(form);
    expect(result.fields[0].options).toEqual({
      source: 'countries',
      params: { region: '{{filters.region}}' },
    });
  });

  it('still accepts a plain string as a source-name shorthand', () => {
    const form = {
      id: 'f',
      type: 'form',
      fields: [{ name: 'country', type: 'select', label: 'Country', options: 'countries' }],
      onSubmit: 'submit',
    };
    expect(FormComponentSchema.parse(form).fields[0].options).toBe('countries');
  });
});

describe('table.data as a data source ref', () => {
  it('accepts { source, params }', () => {
    const table = {
      id: 't',
      type: 'table',
      columns: [{ key: 'id', header: 'ID' }],
      data: { source: 'accounts', params: { service: 'billing' } },
    };
    expect(TableComponentSchema.parse(table).data).toEqual({
      source: 'accounts',
      params: { service: 'billing' },
    });
  });
});

describe('chart.data as a data source ref', () => {
  it('accepts { source, params }', () => {
    const chart = {
      id: 'c',
      type: 'chart',
      data: { source: 'metrics', params: { service: 'billing' } },
    };
    expect(ChartComponentSchema.parse(chart).data).toEqual({
      source: 'metrics',
      params: { service: 'billing' },
    });
  });
});
