import { describe, it, expect } from 'vitest';
import { dataSourceRule } from '../../src/rules/data-source.js';
import type { ValidationRuleContext, ParsedBlock, ValidatorOptions } from '../../src/types.js';
import type { DataSourceDescriptor } from '@mobile-reality/mdma-spec';

function createBlock(index: number, data: Record<string, unknown>): ParsedBlock {
  return {
    index,
    rawYaml: '',
    data,
    startOffset: 0,
    endOffset: 0,
    yamlStartOffset: 0,
    yamlEndOffset: 0,
  };
}

function createContext(blocks: ParsedBlock[], options: ValidatorOptions = {}): ValidationRuleContext {
  const idMap = new Map<string, number>();
  for (const block of blocks) {
    if (block.data && typeof block.data.id === 'string') idMap.set(block.data.id, block.index);
  }
  return { blocks, idMap, issues: [], options };
}

const accountsDescriptor: DataSourceDescriptor = {
  name: 'accounts',
  kind: 'rows',
  columns: [
    { key: 'id', type: 'string', sensitive: false },
    { key: 'name', type: 'string', sensitive: false },
  ],
  params: [{ name: 'service', type: 'string', required: true }],
};

const countriesDescriptor: DataSourceDescriptor = {
  name: 'countries',
  kind: 'options',
  params: [{ name: 'region', type: 'string', required: false, allowed: ['eu', 'na'] }],
};

describe('data-source rule', () => {
  it('is a syntax no-op without a catalog when the ref has a source name', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table',
        id: 't',
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: 'accounts' },
      }),
    ]);
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags a ref with an empty source name even without a catalog', () => {
    const ctx = createContext([
      createBlock(0, {
        type: 'table',
        id: 't',
        columns: [{ key: 'id', header: 'ID' }],
        data: { source: '' },
      }),
    ]);
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('missing a "source"');
  });

  it('flags an unknown source against the catalog', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'table',
          id: 't',
          columns: [{ key: 'id', header: 'ID' }],
          data: { source: 'nope' },
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(1);
    expect(ctx.issues[0].message).toContain('Unknown data source');
  });

  it('flags a missing required param', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'table',
          id: 't',
          columns: [{ key: 'id', header: 'ID' }],
          data: { source: 'accounts' },
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('missing required param'))).toBe(true);
  });

  it('flags a disallowed param value', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [
            {
              name: 'country',
              type: 'select',
              label: 'Country',
              options: { source: 'countries', params: { region: 'apac' } },
            },
          ],
        }),
      ],
      { dataSourceCatalog: { countries: countriesDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('not one of the allowed values'))).toBe(true);
  });

  it('flags a disallowed number param value', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [
            {
              name: 'country',
              type: 'select',
              label: 'Country',
              options: { source: 'sized', params: { size: 7 } },
            },
          ],
        }),
      ],
      {
        dataSourceCatalog: {
          sized: {
            name: 'sized',
            kind: 'options',
            params: [{ name: 'size', type: 'number', allowed: [10, 20] }],
          },
        },
      },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('not one of the allowed values'))).toBe(true);
  });

  it('flags a disallowed boolean param value and accepts an allowed one', () => {
    const catalog = {
      flagged: {
        name: 'flagged',
        kind: 'options' as const,
        params: [{ name: 'active', type: 'boolean' as const, allowed: [true] }],
      },
    };
    const build = (active: boolean) =>
      createContext(
        [
          createBlock(0, {
            type: 'form',
            id: 'f',
            fields: [
              {
                name: 'x',
                type: 'select',
                label: 'X',
                options: { source: 'flagged', params: { active } },
              },
            ],
          }),
        ],
        { dataSourceCatalog: catalog },
      );
    const bad = build(false);
    dataSourceRule.validate(bad);
    expect(bad.issues.some((i) => i.message.includes('not one of the allowed values'))).toBe(true);
    const good = build(true);
    dataSourceRule.validate(good);
    expect(good.issues).toHaveLength(0);
  });

  it('allows a binding expression through allowed-value checks', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [
            {
              name: 'country',
              type: 'select',
              label: 'Country',
              options: { source: 'countries', params: { region: '{{filters.region}}' } },
            },
          ],
        }),
      ],
      { dataSourceCatalog: { countries: countriesDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('flags a table column not provided by the source', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'table',
          id: 't',
          columns: [{ key: 'id', header: 'ID' }, { key: 'ghost', header: 'Ghost' }],
          data: { source: 'accounts', params: { service: 'billing' } },
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('"ghost" is not provided'))).toBe(true);
  });

  it('flags a chart xAxis/yAxis key not provided by the source', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'chart',
          id: 'c',
          data: { source: 'accounts', params: { service: 'billing' } },
          xAxis: 'id',
          yAxis: 'ghost',
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('"ghost" is not provided'))).toBe(true);
  });

  it('never treats a chart.data string (CSV or binding) as a source name', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'chart',
          id: 'c',
          data: 'Month,Revenue\nJan,100\nFeb,200\n',
        }),
        createBlock(1, {
          type: 'chart',
          id: 'c2',
          data: '{{chartData}}',
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('never treats a table.data binding string as a source name', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'table',
          id: 't',
          columns: [{ key: 'id', header: 'ID' }],
          data: '{{tableRows}}',
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('checks a string options shorthand as a data source name too', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [{ name: 'country', type: 'select', label: 'Country', options: 'nope' }],
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues.some((i) => i.message.includes('Unknown data source'))).toBe(true);
  });

  it('never treats a form select options binding string as a source name', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [
            { name: 'country', type: 'select', label: 'Country', options: '{{countries}}' },
          ],
        }),
      ],
      { dataSourceCatalog: { accounts: accountsDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });

  it('passes a string options shorthand that matches the catalog', () => {
    const ctx = createContext(
      [
        createBlock(0, {
          type: 'form',
          id: 'f',
          fields: [{ name: 'country', type: 'select', label: 'Country', options: 'countries' }],
        }),
      ],
      { dataSourceCatalog: { countries: countriesDescriptor } },
    );
    dataSourceRule.validate(ctx);
    expect(ctx.issues).toHaveLength(0);
  });
});
