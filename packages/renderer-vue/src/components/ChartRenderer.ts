import { computed, defineComponent, h } from 'vue';
import { isDataSourceRef, type ChartComponent } from '@mobile-reality/mdma-spec';
import { blockRendererProps } from '../renderers/renderer-props.js';
import { useDataState, useDocumentStore } from '../composables/use-document-store.js';
import { useElementOverride } from '../context/ElementOverridesContext.js';
import { DefaultDataLoading, DefaultDataError, DefaultDataEmpty } from './DataStateViews.js';

interface ParsedChartData {
  headers: string[];
  rows: Record<string, string | number>[];
}

function parseCsvData(raw: string): ParsedChartData {
  const lines = raw
    .trim()
    .split('\n')
    .filter((l) => l.trim() !== '');
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string | number> = {};
    headers.forEach((header, i) => {
      const val = values[i] ?? '';
      const num = Number(val);
      row[header] = val !== '' && !Number.isNaN(num) ? num : val;
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

function renderChartTable(component: ChartComponent, data: ParsedChartData) {
  return h('div', { class: 'mdma-chart', 'data-component-id': component.id }, [
    component.label ? h('div', { class: 'mdma-chart-label' }, component.label) : null,
    h('div', { class: 'mdma-chart-variant' }, `${component.variant ?? 'line'} chart`),
    h('table', { class: 'mdma-chart-data' }, [
      h('thead', [h('tr', data.headers.map((header) => h('th', { key: header }, header)))]),
      h(
        'tbody',
        data.rows.map((row, i) =>
          h(
            'tr',
            { key: i },
            data.headers.map((header) => h('td', { key: header }, String(row[header] ?? ''))),
          ),
        ),
      ),
    ]),
  ]);
}

const DataDrivenChart = defineComponent({
  name: 'MdmaDataDrivenChart',
  props: {
    component: { type: Object, required: true },
  },
  setup(props) {
    const store = useDocumentStore();
    const dataState = useDataState(() => (props.component as ChartComponent).id);
    const DataLoading = useElementOverride('chart', 'dataLoading');
    const DataError = useElementOverride('chart', 'dataError');
    const DataEmpty = useElementOverride('chart', 'dataEmpty');

    return () => {
      const component = props.component as ChartComponent;
      const state = dataState.value;

      if (!state || state.status === 'loading') {
        return h(DataLoading.value ?? DefaultDataLoading, { componentId: component.id });
      }
      if (state.status === 'error') {
        return h(DataError.value ?? DefaultDataError, {
          componentId: component.id,
          error: state.error ?? 'Failed to load chart data',
          onRetry: () => store.value.retryData(component.id),
        });
      }
      if (state.rows.length === 0) {
        return h(DataEmpty.value ?? DefaultDataEmpty, { componentId: component.id });
      }

      return renderChartTable(component, rowsToChartData(state.rows));
    };
  },
});

export const ChartRenderer = defineComponent({
  name: 'ChartRenderer',
  props: blockRendererProps,
  setup(props) {
    const data = computed<ParsedChartData>(() => {
      const component = props.component;
      if (component.type !== 'chart') return { headers: [], rows: [] };
      const raw = component.data;
      if (isDataSourceRef(raw)) return { headers: [], rows: [] };
      if (typeof raw === 'string' && raw.startsWith('{{')) {
        const resolved = props.resolveBinding(raw);
        return typeof resolved === 'string' ? parseCsvData(resolved) : { headers: [], rows: [] };
      }
      return parseCsvData(raw as string);
    });

    return () => {
      const component = props.component;
      if (component.type !== 'chart') return null;

      if (isDataSourceRef(component.data)) {
        return h(DataDrivenChart, { component });
      }

      if (data.value.rows.length === 0) {
        return h(
          'div',
          { class: 'mdma-chart mdma-chart--empty', 'data-component-id': component.id },
          [
            component.label ? h('div', { class: 'mdma-chart-label' }, component.label) : null,
            h('div', { class: 'mdma-chart-empty' }, 'No chart data'),
          ],
        );
      }

      return renderChartTable(component, data.value);
    };
  },
});
