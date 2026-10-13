// @vitest-environment happy-dom
import { MdmaDocument } from '@mobile-reality/mdma-renderer-react';
import type { DocumentStore } from '@mobile-reality/mdma-runtime';
import { act } from 'react';
import { type Root, createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { storeOptionsFor } from './agent/data-source-options.js';
import { parseMarkdown } from './chat/parse-markdown.js';
import { customizations } from './custom-components.js';
import { INCIDENTS_LATENCY_MS, queryIncidents } from './data-sources/resolvers.js';

// biome-ignore lint/suspicious/noExplicitAny: react's act() global switch has no typed home
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const INCIDENTS_DOCUMENT = `\`\`\`mdma
id: incidents
type: table
label: Incidents
pageSize: 10
columns:
  - key: id
    header: ID
    sortable: true
  - key: title
    header: Title
    sortable: true
  - key: severity
    header: Severity
data:
  source: incidents
  params:
    status: open
\`\`\`
`;

const INLINE_DOCUMENT = `\`\`\`mdma
id: team
type: table
label: Team
columns:
  - key: name
    header: Name
data:
  - name: Ada
  - name: Grace
\`\`\`
`;

const COUNTRIES_DOCUMENT = `\`\`\`mdma
id: intake
type: form
onSubmit: submit-intake
fields:
  - name: country
    type: select
    label: Country
    options:
      source: countries
\`\`\`
`;

const SALES_DOCUMENT = `\`\`\`mdma
id: sales
type: chart
variant: bar
label: Sales
xAxis: month
yAxis: revenue
data:
  source: sales-by-month
  params:
    year: 2025
\`\`\`
`;

let container: HTMLDivElement | undefined;
let root: Root | undefined;
let store: DocumentStore | undefined;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  act(() => root?.unmount());
  container?.remove();
  store?.dispose();
  container = undefined;
  root = undefined;
  store = undefined;
  vi.useRealTimers();
});

async function renderDocument(
  markdown: string,
  storeOptions = storeOptionsFor({ externalDataSources: true }),
) {
  const parsed = await parseMarkdown(markdown, undefined, storeOptions);
  store = parsed.store;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <MdmaDocument ast={parsed.ast} store={parsed.store} customizations={customizations} />,
    );
  });
  return container;
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(INCIDENTS_LATENCY_MS);
  });
}

function cellTexts(table: HTMLElement, columnIndex: number) {
  return Array.from(table.querySelectorAll('tbody tr')).map(
    (row) => row.querySelectorAll('td')[columnIndex]?.textContent,
  );
}

const openIncidents = (extra: Record<string, unknown> = {}) =>
  queryIncidents({
    source: 'incidents',
    params: { status: 'open' },
    page: 1,
    pageSize: 10,
    ...extra,
  });

describe('custom table with a source-backed ref', () => {
  it('shows a loading state, then the rows from the incidents resolver', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT);

    expect(view.querySelector('.custom-table .mdma-data-loading')).not.toBeNull();
    expect(view.querySelectorAll('tbody tr')).toHaveLength(0);

    await settle();

    const expected = openIncidents();
    expect(cellTexts(view, 0)).toEqual(expected.rows.map((row) => row.id));
    expect(view.textContent).not.toContain('No data available');
    expect(view.querySelector('.mdma-data-loading')).toBeNull();
  });

  it('pages through the resolver and keeps the previous rows while the next page loads', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT);
    await settle();
    const firstPage = openIncidents().rows.map((row) => row.id);

    const next = Array.from(
      view.querySelectorAll<HTMLButtonElement>('.custom-table-pagination button'),
    ).find((button) => button.textContent === 'Next');
    expect(view.querySelector('.custom-table-pagination-status')?.textContent).toContain('Page 1');
    await act(async () => next?.click());

    expect(cellTexts(view, 0)).toEqual(firstPage);
    expect(view.querySelector('.custom-table .mdma-table-loading-indicator')).not.toBeNull();

    await settle();

    expect(cellTexts(view, 0)).toEqual(openIncidents({ page: 2 }).rows.map((row) => row.id));
    expect(view.querySelector('.custom-table-pagination-status')?.textContent).toContain('Page 2');
  });

  it('sorts through the resolver when a sortable header is clicked', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT);
    await settle();

    const titleHeader = Array.from(view.querySelectorAll('th')).find((th) =>
      th.textContent?.startsWith('Title'),
    );
    await act(async () => titleHeader?.click());
    await settle();

    const sorted = openIncidents({ sort: { key: 'title', direction: 'asc' } });
    expect(cellTexts(view, 1)).toEqual(sorted.rows.map((row) => row.title));
    expect(titleHeader?.getAttribute('aria-sort')).toBe('ascending');
  });

  it('shows the error view with a retry when the resolver fails', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT, {
      dataSources: {
        incidents: async () => {
          throw new Error('incidents unavailable');
        },
      },
    });
    await settle();

    expect(view.querySelector('.custom-table .mdma-data-error')?.textContent).toContain(
      'incidents unavailable',
    );
    expect(view.querySelector('.mdma-data-error button')?.textContent).toBe('Retry');
  });

  it('keeps binding-looking resolver values literal', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT, {
      dataSources: {
        incidents: async () => ({
          rows: [{ id: 'INC-1', title: '{{incidents.id}}', severity: 'low' }],
          total: 1,
        }),
      },
    });
    await settle();

    expect(cellTexts(view, 1)).toEqual(['{{incidents.id}}']);
  });

  it('shows the empty view when the resolver returns no rows', async () => {
    const view = await renderDocument(INCIDENTS_DOCUMENT, {
      dataSources: { incidents: async () => ({ rows: [], total: 0 }) },
    });
    await settle();

    expect(view.querySelector('.custom-table .mdma-data-empty')).not.toBeNull();
  });
});

describe('custom table with inline data', () => {
  it('renders the inline rows without touching the data store', async () => {
    const view = await renderDocument(INLINE_DOCUMENT, undefined);

    expect(cellTexts(view, 0)).toEqual(['Ada', 'Grace']);
    expect(view.querySelector('.mdma-data-loading')).toBeNull();
    expect(view.querySelector('.custom-table-pagination')).toBeNull();
  });
});

describe('other overrides with source-backed data', () => {
  it('fills the glass select from a source-backed options ref', async () => {
    const view = await renderDocument(COUNTRIES_DOCUMENT);
    await settle();

    const select = view.querySelector('select.ce-glass-select');
    const labels = Array.from(select?.querySelectorAll('option') ?? []).map((o) => o.textContent);
    expect(labels[0]).toBe('Pick one...');
    expect(labels).toContain('Poland');
  });

  it('renders the chart override from a source-backed series', async () => {
    const view = await renderDocument(SALES_DOCUMENT);
    await settle();

    expect(view.querySelector('.mdma-chart')).not.toBeNull();
    expect(view.querySelector('.mdma-chart-empty, .mdma-data-empty')).toBeNull();
  });
});
