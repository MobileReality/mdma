import { el } from '../dom/el.js';
import { stateless } from '../renderers/renderer-props.js';

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

/** Draws chart data as a table. Override with a charting library via customizations. */
export const ChartRenderer = stateless(({ component, resolveBinding }) => {
  if (component.type !== 'chart') return el('div');

  const raw = component.data;
  let data: ParsedChartData = { headers: [], rows: [] };
  if (typeof raw === 'string' && raw.startsWith('{{')) {
    const resolved = resolveBinding(raw);
    if (typeof resolved === 'string') data = parseCsvData(resolved);
  } else if (typeof raw === 'string') {
    data = parseCsvData(raw);
  }

  const label = component.label && el('div', { class: 'mdma-chart-label' }, [component.label]);

  if (data.rows.length === 0) {
    return el(
      'div',
      { class: 'mdma-chart mdma-chart--empty', dataset: { 'component-id': component.id } },
      [label, el('div', { class: 'mdma-chart-empty' }, ['No chart data'])],
    );
  }

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
});
