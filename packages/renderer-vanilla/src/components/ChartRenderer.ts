import { isDataSourceRef, type ChartComponent } from '@mobile-reality/mdma-spec';
import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';
import type { MdmaBlockRendererProps } from '../renderers/renderer-props.js';
import { renderDataLoading, renderDataError, renderDataEmpty } from './data-state-views.js';

interface ParsedChartData {
  headers: string[];
  rows: Record<string, string | number>[];
}

function parseCsvData(raw: string): ParsedChartData {
  const lines = raw
    .trim()
    .split('\n')
    .filter((line) => line.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((header) => header.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    const row: Record<string, string | number> = {};
    headers.forEach((header, index) => {
      const value = values[index] ?? '';
      const numeric = Number(value);
      row[header] = value !== '' && !Number.isNaN(numeric) ? numeric : value;
    });
    return row;
  });

  return { headers, rows };
}

function rowsToChartData(rows: unknown[]): ParsedChartData {
  const headers = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row as Record<string, unknown>)) headers.add(key);
  }
  return { headers: [...headers], rows: rows as Record<string, string | number>[] };
}

function chartTable(component: ChartComponent, data: ParsedChartData): HTMLElement {
  const label = component.label && el('div', { class: 'mdma-chart-label' }, [component.label]);

  return el('div', { class: 'mdma-chart', dataset: { 'component-id': component.id } }, [
    label,
    el('div', { class: 'mdma-chart-variant' }, [`${component.variant ?? 'line'} chart`]),
    el('table', { class: 'mdma-chart-data' }, [
      el('thead', {}, [
        el(
          'tr',
          {},
          data.headers.map((header) => el('th', {}, [header])),
        ),
      ]),
      el(
        'tbody',
        {},
        data.rows.map((row) =>
          el(
            'tr',
            {},
            data.headers.map((header) => el('td', {}, [String(row[header] ?? '')])),
          ),
        ),
      ),
    ]),
  ]);
}

function dataDrivenChart(props: MdmaBlockRendererProps, component: ChartComponent): HTMLElement {
  const state = props.getDataState(component.id);

  if (!state || state.status === 'loading') {
    return renderDataLoading(props.context, 'chart', component.id);
  }
  if (state.status === 'error') {
    return renderDataError(
      props.context,
      'chart',
      component.id,
      state.error ?? 'Failed to load chart data',
      () => props.retryData(component.id),
    );
  }
  if (state.rows.length === 0) {
    return renderDataEmpty(props.context, 'chart', component.id);
  }

  return chartTable(component, rowsToChartData(state.rows));
}

export const ChartRenderer = stateless((props) => {
  const { component, resolveBinding } = props;
  if (component.type !== 'chart') return el('div');

  if (isDataSourceRef(component.data)) {
    return dataDrivenChart(props, component);
  }

  const raw = component.data;
  let data: ParsedChartData = { headers: [], rows: [] };
  if (typeof raw === 'string' && raw.startsWith('{{')) {
    const resolved = resolveBinding(raw);
    if (typeof resolved === 'string') data = parseCsvData(resolved);
  } else if (typeof raw === 'string') {
    data = parseCsvData(raw);
  }

  if (data.rows.length === 0) {
    const label = component.label && el('div', { class: 'mdma-chart-label' }, [component.label]);
    return el(
      'div',
      { class: 'mdma-chart mdma-chart--empty', dataset: { 'component-id': component.id } },
      [label, el('div', { class: 'mdma-chart-empty' }, ['No chart data'])],
    );
  }

  return chartTable(component, data);
});
