import { memo, useMemo } from 'react';
import type { ChartComponent } from '@mobile-reality/mdma-spec';
import type { MdmaBlockRendererProps } from '@mobile-reality/mdma-renderer-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ─── CSV Data Parser ─────────────────────────────────────────────────────────

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
      row[header] = val !== '' && !isNaN(num) ? num : val;
    });
    return row;
  });

  return { headers, rows };
}

function arrayToChartData(resolved: unknown): ParsedChartData {
  if (!Array.isArray(resolved) || resolved.length === 0) return { headers: [], rows: [] };
  const first = resolved[0] as Record<string, unknown>;
  const headers = Object.keys(first);
  const rows = resolved.map((item) => {
    const row: Record<string, string | number> = {};
    for (const key of headers) {
      const val = (item as Record<string, unknown>)[key];
      row[key] = typeof val === 'number' ? val : String(val ?? '');
    }
    return row;
  });
  return { headers, rows };
}

// ─── Color Palette ───────────────────────────────────────────────────────────

const DEFAULT_COLORS = [
  '#6c5ce7',
  '#00b894',
  '#fdcb6e',
  '#e74c3c',
  '#a29bfe',
  '#74b9ff',
  '#fd79a8',
  '#55efc4',
];

// ─── Shared helpers ──────────────────────────────────────────────────────────

function resolveChartData(
  chart: ChartComponent,
  resolveBinding: (expr: string) => unknown,
): { data: ParsedChartData; xKey: string; yKeys: string[]; colors: string[] } {
  let parsed: ParsedChartData;
  if (typeof chart.data === 'string' && chart.data.startsWith('{{')) {
    const resolved = resolveBinding(chart.data);
    parsed = typeof resolved === 'string' ? parseCsvData(resolved) : arrayToChartData(resolved);
  } else {
    parsed = parseCsvData(chart.data as string);
  }

  const xKey = chart.xAxis ?? parsed.headers[0] ?? '';
  const yKeys = chart.yAxis
    ? Array.isArray(chart.yAxis)
      ? chart.yAxis
      : [chart.yAxis]
    : parsed.headers.filter((h) => h !== xKey);
  const colors = chart.colors ?? DEFAULT_COLORS;

  return { data: parsed, xKey, yKeys, colors };
}

// ─── Tooltip style ───────────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: '#1a1a2e',
    border: '1px solid rgba(162, 155, 254, 0.3)',
    borderRadius: 8,
    fontSize: 12,
    color: '#dfe6e9',
  },
  itemStyle: { color: '#dfe6e9' },
  labelStyle: { color: '#a29bfe', fontWeight: 600 },
};

// ─── Line ────────────────────────────────────────────────────────────────────

function RechartLine({
  data,
  xKey,
  yKeys,
  colors,
  chart,
}: {
  data: ParsedChartData;
  xKey: string;
  yKeys: string[];
  colors: string[];
  chart: ChartComponent;
}) {
  return (
    <ResponsiveContainer width="100%" height={chart.height}>
      <LineChart data={data.rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12, color: '#b2bec3' }} />}
        {yKeys.map((key, i) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2.5}
            dot={{ r: 3, fill: colors[i % colors.length] }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

function RechartBar({
  data,
  xKey,
  yKeys,
  colors,
  chart,
}: {
  data: ParsedChartData;
  xKey: string;
  yKeys: string[];
  colors: string[];
  chart: ChartComponent;
}) {
  return (
    <ResponsiveContainer width="100%" height={chart.height}>
      <BarChart data={data.rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12, color: '#b2bec3' }} />}
        {yKeys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            radius={[3, 3, 0, 0]}
            stackId={chart.stacked ? 'stack' : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Area ────────────────────────────────────────────────────────────────────

function RechartArea({
  data,
  xKey,
  yKeys,
  colors,
  chart,
}: {
  data: ParsedChartData;
  xKey: string;
  yKeys: string[];
  colors: string[];
  chart: ChartComponent;
}) {
  return (
    <ResponsiveContainer width="100%" height={chart.height}>
      <AreaChart data={data.rows} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        {chart.showGrid && <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />}
        <XAxis
          dataKey={xKey}
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#636e72', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(0,0,0,0.15)' }}
          tickLine={false}
        />
        <Tooltip {...tooltipStyle} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12, color: '#b2bec3' }} />}
        {yKeys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            fill={colors[i % colors.length]}
            fillOpacity={0.15}
            strokeWidth={2}
            stackId={chart.stacked ? 'stack' : undefined}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Pie ─────────────────────────────────────────────────────────────────────

function renderPieLabel(props: { name?: string; percent?: number }) {
  return `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`;
}

function RechartPie({
  data,
  xKey,
  yKeys,
  colors,
  chart,
}: {
  data: ParsedChartData;
  xKey: string;
  yKeys: string[];
  colors: string[];
  chart: ChartComponent;
}) {
  const valueKey = yKeys[0] ?? data.headers.find((h) => h !== xKey) ?? '';

  return (
    <ResponsiveContainer width="100%" height={chart.height}>
      <PieChart>
        <Pie
          data={data.rows}
          dataKey={valueKey}
          nameKey={xKey}
          cx="50%"
          cy="50%"
          outerRadius="75%"
          label={renderPieLabel}
          labelLine={{ stroke: 'rgba(0,0,0,0.2)' }}
          strokeWidth={1}
          stroke="rgba(0,0,0,0.2)"
        >
          {data.rows.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        {chart.showLegend && <Legend wrapperStyle={{ fontSize: 12, color: '#b2bec3' }} />}
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Main Renderer ───────────────────────────────────────────────────────────

export const ChartRenderer = memo(function ChartRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  const chart = component as unknown as ChartComponent;

  const { data, xKey, yKeys, colors } = useMemo(
    () => resolveChartData(chart, resolveBinding),
    [chart, resolveBinding],
  );

  if (data.rows.length === 0) {
    return (
      <div className="mdma-chart mdma-chart--empty" data-component-id={component.id}>
        {chart.label && <div className="mdma-chart-label">{chart.label}</div>}
        <div className="mdma-chart-empty">No chart data</div>
      </div>
    );
  }

  const props = { data, xKey, yKeys, colors, chart };

  return (
    <div className="mdma-chart" data-component-id={component.id}>
      {chart.label && <div className="mdma-chart-label">{chart.label}</div>}
      {chart.variant === 'line' && <RechartLine {...props} />}
      {chart.variant === 'bar' && <RechartBar {...props} />}
      {chart.variant === 'area' && <RechartArea {...props} />}
      {chart.variant === 'pie' && <RechartPie {...props} />}
    </div>
  );
});
