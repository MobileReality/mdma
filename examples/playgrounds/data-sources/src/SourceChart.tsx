import {
  DefaultDataEmpty,
  DefaultDataError,
  DefaultDataLoading,
  type MdmaBlockRendererProps,
  useDataState,
  useDocumentStore,
} from '@mobile-reality/mdma-renderer-react';
import type { ChartComponent } from '@mobile-reality/mdma-spec';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const COLORS = ['#6c5ce7', '#00b894', '#fdcb6e', '#e74c3c'];

function toArray(yAxis: ChartComponent['yAxis']): string[] | undefined {
  if (!yAxis) return undefined;
  return Array.isArray(yAxis) ? yAxis : [yAxis];
}

export function SourceChartRenderer({ component }: MdmaBlockRendererProps) {
  const chart = component as unknown as ChartComponent;
  const store = useDocumentStore();
  const dataState = useDataState(chart.id);

  if (!dataState || dataState.status === 'loading' || dataState.status === 'idle') {
    return <DefaultDataLoading componentId={chart.id} />;
  }
  if (dataState.status === 'error') {
    return (
      <DefaultDataError
        componentId={chart.id}
        error={dataState.error ?? 'Failed to load chart data'}
        onRetry={() => store.retryData(chart.id)}
      />
    );
  }
  if (dataState.rows.length === 0) {
    return <DefaultDataEmpty componentId={chart.id} label={chart.label} />;
  }

  const rows = dataState.rows as Record<string, unknown>[];
  const headers = Object.keys(rows[0]);
  const xKey = chart.xAxis ?? headers[0];
  const yKeys = toArray(chart.yAxis) ?? headers.filter((h) => h !== xKey);
  const isBar = chart.variant === 'bar';
  const Chart = isBar ? BarChart : LineChart;

  return (
    <div className="mdma-chart" data-component-id={chart.id}>
      {chart.label && <div className="mdma-chart-label">{chart.label}</div>}
      <ResponsiveContainer width="100%" height={chart.height}>
        <Chart data={rows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
          <Legend />
          {yKeys.map((key, i) =>
            isBar ? (
              <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
            ) : (
              <Line key={key} dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={2} />
            ),
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}
