import { memo, useMemo } from 'react';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';

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
 * Override with a richer renderer (e.g. recharts) via customizations.
 */
export const ChartRenderer = memo(function ChartRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  if (component.type !== 'chart') return null;

  const data = useMemo(() => {
    const raw = component.data;
    if (typeof raw === 'string' && raw.startsWith('{{')) {
      const resolved = resolveBinding(raw);
      return typeof resolved === 'string' ? parseCsvData(resolved) : { headers: [], rows: [] };
    }
    return parseCsvData(raw as string);
  }, [component.data, resolveBinding]);

  if (data.rows.length === 0) {
    return (
      <div className="mdma-chart mdma-chart--empty" data-component-id={component.id}>
        {component.label && <div className="mdma-chart-label">{component.label}</div>}
        <div className="mdma-chart-empty">No chart data</div>
      </div>
    );
  }

  return (
    <div className="mdma-chart" data-component-id={component.id}>
      {component.label && <div className="mdma-chart-label">{component.label}</div>}
      <div className="mdma-chart-variant">{component.variant ?? 'line'} chart</div>
      <table className="mdma-chart-data">
        <thead>
          <tr>
            {data.headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.rows.map((row, i) => (
            <tr key={i}>
              {data.headers.map((h) => (
                <td key={h}>{String(row[h] ?? '')}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});
