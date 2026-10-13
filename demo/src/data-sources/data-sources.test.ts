import { indexDataSources } from '@mobile-reality/mdma-spec';
import { validate } from '@mobile-reality/mdma-validator';
import { describe, expect, it } from 'vitest';
import { DEMO_DATA_SOURCES } from './catalog.js';
import {
  INCIDENTS_LATENCY_MS,
  resolveCountries,
  resolveIncidents,
  resolveSalesByMonth,
  resolveSalesRecords,
} from './resolvers.js';
import type { Incident } from './seeded-incidents.js';

const ctx = () => ({ signal: new AbortController().signal });

const incidentRequest = (overrides: Record<string, unknown> = {}) => ({
  source: 'incidents',
  params: { status: 'open' },
  ...overrides,
});

const incidentsDocument = (params: string) => `# Incidents

\`\`\`mdma
id: incidents
type: table
label: Incidents
sortable: true
pageSize: 10
columns:
  - key: id
    header: ID
    sortable: true
  - key: title
    header: Title
  - key: opened_at
    header: Opened
    sortable: true
data:
  source: incidents
  params:
${params}
\`\`\`
`;

const dataSourceIssues = (markdown: string) =>
  validate(markdown, { exclude: ['thinking-block'], dataSourceCatalog: DEMO_DATA_SOURCES })
    .issues.filter((issue) => issue.ruleId === 'data-source')
    .map((issue) => issue.message);

describe('demo data source catalog', () => {
  it('passes indexDataSources with the four prepared sources', () => {
    expect(Object.keys(indexDataSources(DEMO_DATA_SOURCES))).toEqual([
      'incidents',
      'countries',
      'sales-by-month',
      'sales-records',
    ]);
  });

  it('attaches a resolver to every source', () => {
    for (const source of DEMO_DATA_SOURCES) {
      expect(source.resolve, source.name).toBeTypeOf('function');
    }
  });
});

describe('incidents resolver', () => {
  it('returns page 2 of 10 rows with the total', async () => {
    const result = await resolveIncidents(incidentRequest({ page: 2, pageSize: 10 }), ctx());
    expect(result.rows).toHaveLength(10);
    expect(result.total).toBeGreaterThan(10);
  });

  it('serves only rows of the requested status', async () => {
    const result = await resolveIncidents(incidentRequest({ pageSize: 50 }), ctx());
    expect((result.rows as Incident[]).every((row) => row.status === 'open')).toBe(true);
  });

  it('orders rows by the requested column', async () => {
    const result = await resolveIncidents(
      incidentRequest({ sort: { key: 'id', direction: 'desc' }, pageSize: 20 }),
      ctx(),
    );
    const ids = (result.rows as Incident[]).map((row) => row.id);
    expect(ids).toEqual([...ids].sort().reverse());
  });

  it('narrows the result with a filter', async () => {
    const all = await resolveIncidents(incidentRequest(), ctx());
    const filtered = await resolveIncidents(incidentRequest({ filter: 'certificate' }), ctx());
    expect(filtered.total).toBeGreaterThan(0);
    expect(filtered.total).toBeLessThan(all.total ?? 0);
  });

  it('narrows the result by the service param', async () => {
    const result = await resolveIncidents(
      incidentRequest({ params: { status: 'open', service: 'auth' }, pageSize: 50 }),
      ctx(),
    );
    expect((result.rows as Incident[]).every((row) => row.service === 'auth')).toBe(true);
  });

  it('rejects with an AbortError when the request is aborted', async () => {
    const controller = new AbortController();
    const pending = resolveIncidents(incidentRequest(), { signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('answers after a small latency', async () => {
    const startedAt = Date.now();
    await resolveIncidents(incidentRequest(), ctx());
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(INCIDENTS_LATENCY_MS - 20);
  });
});

describe('countries resolver', () => {
  it('returns label/value options', async () => {
    const result = await resolveCountries({ source: 'countries', params: {} }, ctx());
    expect(result.rows.length).toBeGreaterThan(10);
    expect(result.rows[0]).toEqual({ label: expect.any(String), value: expect.any(String) });
  });

  it('narrows options by region', async () => {
    const all = await resolveCountries({ source: 'countries', params: {} }, ctx());
    const europe = await resolveCountries(
      { source: 'countries', params: { region: 'europe' } },
      ctx(),
    );
    expect(europe.rows.length).toBeLessThan(all.rows.length);
  });
});

describe('sales-by-month resolver', () => {
  it('returns one series row per month', async () => {
    const result = await resolveSalesByMonth(
      { source: 'sales-by-month', params: { year: 2025 } },
      ctx(),
    );
    expect(result.rows).toHaveLength(12);
    expect(result.rows[0]).toEqual({
      month: 'Jan',
      revenue: expect.any(Number),
      orders: expect.any(Number),
    });
  });
});

describe('sales-records resolver', () => {
  it('returns the same rows as the series twin', async () => {
    const params = { year: 2024 };
    const records = await resolveSalesRecords({ source: 'sales-records', params }, ctx());
    const series = await resolveSalesByMonth({ source: 'sales-by-month', params }, ctx());
    expect(records.rows).toHaveLength(12);
    expect(records.rows).toEqual(series.rows);
  });
});

describe('sales-records filter, sort and paging', () => {
  const salesRequest = (overrides: Record<string, unknown> = {}) => ({
    source: 'sales-records',
    params: { year: 2025 },
    ...overrides,
  });

  it('filters rows by a case-insensitive substring', async () => {
    const result = await resolveSalesRecords(salesRequest({ filter: 'jan' }), ctx());
    expect(result.rows).toEqual([{ month: 'Jan', revenue: 42, orders: 400 }]);
    expect(result.total).toBe(1);
  });

  it('orders rows numerically by the requested key', async () => {
    const result = await resolveSalesRecords(
      salesRequest({ sort: { key: 'revenue', direction: 'desc' } }),
      ctx(),
    );
    const revenues = (result.rows as { revenue: number }[]).map((row) => row.revenue);
    expect(revenues).toEqual([...revenues].sort((a, b) => b - a));
  });

  it('pages only when a page size is given and keeps the full total', async () => {
    const result = await resolveSalesRecords(salesRequest({ page: 3, pageSize: 5 }), ctx());
    expect(result.rows).toHaveLength(2);
    expect(result.total).toBe(12);
  });

  it('returns every row when no paging params are sent', async () => {
    const result = await resolveSalesRecords(salesRequest(), ctx());
    expect(result.rows).toHaveLength(12);
    expect(result.total).toBe(12);
  });
});

describe('countries filter', () => {
  it('narrows options by a case-insensitive substring', async () => {
    const all = await resolveCountries({ source: 'countries', params: {} }, ctx());
    const filtered = await resolveCountries(
      { source: 'countries', params: {}, filter: 'POLAND' },
      ctx(),
    );
    expect(filtered.rows).toContainEqual({ label: 'Poland', value: expect.any(String) });
    expect(filtered.total).toBeLessThan(all.total ?? 0);
  });
});

const salesTable = (source: string) => `\`\`\`mdma
id: sales-table
type: table
label: Sales
columns:
  - key: month
    header: Month
  - key: revenue
    header: Revenue
data:
  source: ${source}
  params:
    year: 2024
\`\`\`
`;

describe('documents referencing the catalog', () => {
  it('validates a table bound to sales-records without data-source issues', () => {
    expect(dataSourceIssues(salesTable('sales-records'))).toEqual([]);
  });

  it('still flags a table bound to the series source', () => {
    expect(dataSourceIssues(salesTable('sales-by-month'))).not.toEqual([]);
  });

  it('validates an incidents table ref without data-source issues', () => {
    expect(dataSourceIssues(incidentsDocument('    status: open'))).toEqual([]);
  });

  it('validates a countries select and a sales chart ref without data-source issues', () => {
    const markdown = `\`\`\`mdma
id: shipping
type: form
fields:
  - name: country
    type: select
    label: Country
    options:
      source: countries
      params:
        region: europe
onSubmit: ship
\`\`\`

\`\`\`mdma
id: revenue
type: chart
variant: bar
xAxis: month
yAxis: revenue
data:
  source: sales-by-month
  params:
    year: 2025
\`\`\`
`;
    expect(dataSourceIssues(markdown)).toEqual([]);
  });

  it('flags a param value the catalog does not allow', () => {
    expect(dataSourceIssues(incidentsDocument('    status: pending'))).not.toEqual([]);
  });
});
