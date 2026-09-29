import { memo, useMemo } from 'react';
import { isDataSourceRef, type ChartComponent } from '@mobile-reality/mdma-spec';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useDataState, useDocumentStore } from '../hooks/use-document-store.js';
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

export const ChartRenderer = memo(function ChartRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  const data = useMemo(() => {
    if (component.type !== 'chart') return { headers: [], rows: [] };
    const raw = component.data;
    if (isDataSourceRef(raw)) return { headers: [], rows: [] };
    if (typeof raw === 'string' && raw.startsWith('{{')) {
      const resolved = resolveBinding(raw);
      return typeof resolved === 'string' ? parseCsvData(resolved) : { headers: [], rows: [] };
    }
    return parseCsvData(raw as string);
  }, [component, resolveBinding]);

  if (component.type !== 'chart') return null;

  if (isDataSourceRef(component.data)) {
    return <DataDrivenChart component={component} />;
  }

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

function DataDrivenChart({ component }: { component: ChartComponent }) {
  const store = useDocumentStore();
  const dataState = useDataState(component.id);
  const DataLoading = useElementOverride('chart', 'dataLoading') ?? DefaultDataLoading;
  const DataError = useElementOverride('chart', 'dataError') ?? DefaultDataError;
  const DataEmpty = useElementOverride('chart', 'dataEmpty') ?? DefaultDataEmpty;

  if (!dataState || dataState.status === 'loading') {
    return <DataLoading componentId={component.id} />;
  }
  if (dataState.status === 'error') {
    return (
      <DataError
        componentId={component.id}
        error={dataState.error ?? 'Failed to load chart data'}
        onRetry={() => store.retryData(component.id)}
      />
    );
  }
  if (dataState.rows.length === 0) {
    return <DataEmpty componentId={component.id} label={component.label} />;
  }

  const data = rowsToChartData(dataState.rows);

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
}
