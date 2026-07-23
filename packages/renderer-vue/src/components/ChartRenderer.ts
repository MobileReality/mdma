import { computed, defineComponent, h } from 'vue';
import { blockRendererProps } from '../renderers/renderer-props.js';

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

/**
 * Basic built-in chart renderer.
 * Renders chart data as a simple HTML table.
 * Override with a richer renderer (e.g. a charting library) via customizations.
 */
export const ChartRenderer = defineComponent({
  name: 'ChartRenderer',
  props: blockRendererProps,
  setup(props) {
    const data = computed<ParsedChartData>(() => {
      const component = props.component;
      if (component.type !== 'chart') return { headers: [], rows: [] };

      const raw = component.data;
      if (typeof raw === 'string' && raw.startsWith('{{')) {
        const resolved = props.resolveBinding(raw);
        return typeof resolved === 'string' ? parseCsvData(resolved) : { headers: [], rows: [] };
      }
      return parseCsvData(raw as string);
    });

    return () => {
      const component = props.component;
      if (component.type !== 'chart') return null;

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

      return h('div', { class: 'mdma-chart', 'data-component-id': component.id }, [
        component.label ? h('div', { class: 'mdma-chart-label' }, component.label) : null,
        h('div', { class: 'mdma-chart-variant' }, `${component.variant ?? 'line'} chart`),
        h('table', { class: 'mdma-chart-data' }, [
          h('thead', [
            h(
              'tr',
              data.value.headers.map((header) => h('th', { key: header }, header)),
            ),
          ]),
          h(
            'tbody',
            data.value.rows.map((row, i) =>
              h(
                'tr',
                { key: i },
                data.value.headers.map((header) =>
                  h('td', { key: header }, String(row[header] ?? '')),
                ),
              ),
            ),
          ),
        ]),
      ]);
    };
  },
});
