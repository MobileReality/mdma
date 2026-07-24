import { computed, defineComponent, h, type VNode } from 'vue';
import { blockRendererProps } from '@mobile-reality/mdma-renderer-vue';

/**
 * A real 2D chart, registered as the `chart` renderer via
 * `customizations.components.chart`. The built-in renderer shows the data as a
 * table; this draws it as an inline SVG (bar / line / area / pie) with no
 * charting dependency — exactly the kind of presentation override the renderer
 * is designed for.
 */

const PALETTE = ['#6c5ce7', '#00b894', '#e17055', '#0984e3', '#fdcb6e', '#e84393'];

interface Parsed {
  x: string;
  labels: string[];
  series: { key: string; values: number[] }[];
  max: number;
}

function parseCsv(raw: string) {
  const lines = raw
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] as Record<string, string>[] };
  const headers = lines[0].split(',').map((h) => h.trim());
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((hd, i) => {
      row[hd] = cells[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}

/** Resolve which column is the x axis and which are numeric series. */
function shape(
  raw: string,
  xAxis: string | undefined,
  yAxis: string | string[] | undefined,
): Parsed | null {
  const { headers, rows } = parseCsv(raw);
  if (!headers.length || !rows.length) return null;

  const x = xAxis && headers.includes(xAxis) ? xAxis : headers[0];
  const explicit = yAxis ? (Array.isArray(yAxis) ? yAxis : [yAxis]) : null;
  const keys = (explicit ?? headers.filter((hd) => hd !== x)).filter((k) => headers.includes(k));

  const series = keys.map((key) => ({
    key,
    values: rows.map((r) => Number(r[key]) || 0),
  }));
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  return { x, labels: rows.map((r) => r[x]), series, max };
}

// ── SVG geometry ──────────────────────────────────────────────────────────────
const W = 640;
const PAD = { top: 16, right: 16, bottom: 34, left: 40 };

function plotArea(height: number) {
  return { w: W - PAD.left - PAD.right, ph: height - PAD.top - PAD.bottom };
}

function barChart(p: Parsed, height: number, colors: string[]): VNode[] {
  const { w, ph } = plotArea(height);
  const groups = p.labels.length;
  const groupW = w / groups;
  const barW = (groupW * 0.72) / p.series.length;
  const rects: VNode[] = [];
  for (let g = 0; g < groups; g++) {
    for (let s = 0; s < p.series.length; s++) {
      const v = p.series[s].values[g];
      const bh = (v / p.max) * ph;
      const x = PAD.left + g * groupW + groupW * 0.14 + s * barW;
      rects.push(
        h('rect', {
          key: `${g}-${s}`,
          x,
          y: PAD.top + ph - bh,
          width: Math.max(barW - 2, 1),
          height: bh,
          rx: 2,
          fill: colors[s % colors.length],
        }),
      );
    }
  }
  return rects;
}

function linePoints(values: number[], max: number, height: number) {
  const { w, ph } = plotArea(height);
  const step = values.length > 1 ? w / (values.length - 1) : 0;
  return values.map((v, i) => [PAD.left + i * step, PAD.top + ph - (v / max) * ph] as const);
}

function lineChart(p: Parsed, height: number, colors: string[], area: boolean): VNode[] {
  const { ph } = plotArea(height);
  const nodes: VNode[] = [];
  p.series.forEach((s, si) => {
    const pts = linePoints(s.values, p.max, height);
    const color = colors[si % colors.length];
    if (area) {
      const first = pts[0];
      const last = pts[pts.length - 1];
      const d = `M${first[0]},${PAD.top + ph} ${pts.map((pt) => `L${pt[0]},${pt[1]}`).join(' ')} L${last[0]},${PAD.top + ph} Z`;
      nodes.push(h('path', { key: `a${si}`, d, fill: color, 'fill-opacity': 0.15 }));
    }
    nodes.push(
      h('polyline', {
        key: `l${si}`,
        points: pts.map((pt) => pt.join(',')).join(' '),
        fill: 'none',
        stroke: color,
        'stroke-width': 2,
        'stroke-linejoin': 'round',
      }),
    );
    pts.forEach((pt, i) =>
      nodes.push(h('circle', { key: `c${si}-${i}`, cx: pt[0], cy: pt[1], r: 2.5, fill: color })),
    );
  });
  return nodes;
}

function pieChart(p: Parsed, height: number, colors: string[]) {
  const values = p.series[0]?.values ?? [];
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = W / 2;
  const cy = height / 2;
  const r = Math.min(W, height) / 2 - 20;
  let angle = -Math.PI / 2;
  return values.map((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += slice;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = slice > Math.PI ? 1 : 0;
    return h('path', {
      key: i,
      d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`,
      fill: colors[i % colors.length],
      stroke: 'var(--mdma-color-background, #fff)',
      'stroke-width': 1,
    });
  });
}

function axisLabels(p: Parsed, height: number): VNode[] {
  const { w, ph } = plotArea(height);
  const step = w / p.labels.length;
  return p.labels.map((label, i) =>
    h(
      'text',
      {
        key: i,
        x: PAD.left + step * i + step / 2,
        y: PAD.top + ph + 20,
        'text-anchor': 'middle',
        'font-size': 11,
        fill: 'var(--mdma-color-text-muted, #888)',
      },
      label,
    ),
  );
}

export const ChartRenderer = defineComponent({
  name: 'CustomChartRenderer',
  props: blockRendererProps,
  setup(props) {
    const parsed = computed<Parsed | null>(() => {
      const c = props.component;
      if (c.type !== 'chart') return null;
      const raw =
        typeof c.data === 'string' && c.data.startsWith('{{')
          ? String(props.resolveBinding(c.data) ?? '')
          : String(c.data ?? '');
      return shape(raw, c.xAxis, c.yAxis);
    });

    return () => {
      const c = props.component;
      if (c.type !== 'chart') return null;
      const p = parsed.value;

      if (!p) {
        return h('div', { class: 'mdma-chart mdma-chart--empty', 'data-component-id': c.id }, [
          c.label ? h('div', { class: 'mdma-chart-label' }, c.label) : null,
          h('div', { class: 'mdma-chart-empty' }, 'No chart data'),
        ]);
      }

      const variant = c.variant ?? 'line';
      const height = c.height ?? 300;
      const colors = c.colors?.length ? c.colors : PALETTE;

      let marks;
      if (variant === 'bar') marks = barChart(p, height, colors);
      else if (variant === 'pie') marks = pieChart(p, height, colors);
      else marks = lineChart(p, height, colors, variant === 'area');

      const showAxis = variant !== 'pie';

      return h('div', { class: 'mdma-chart', 'data-component-id': c.id }, [
        c.label ? h('div', { class: 'mdma-chart-label' }, c.label) : null,
        h(
          'svg',
          {
            viewBox: `0 0 ${W} ${height}`,
            width: '100%',
            role: 'img',
            'aria-label': `${variant} chart`,
            style: { maxWidth: '100%', display: 'block' },
          },
          [...(showAxis ? axisLabels(p, height) : []), ...marks],
        ),
        c.showLegend !== false && p.series.length > 1
          ? h(
              'div',
              { class: 'mdma-chart-legend', style: legendStyle },
              p.series.map((s, i) =>
                h('span', { key: s.key, style: legendItem }, [
                  h('span', { style: { ...swatch, background: colors[i % colors.length] } }),
                  s.key,
                ]),
              ),
            )
          : null,
      ]);
    };
  },
});

const legendStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.75rem',
  marginTop: '0.4rem',
  fontSize: '0.78rem',
} as const;
const legendItem = { display: 'inline-flex', alignItems: 'center', gap: '0.35rem' } as const;
const swatch = {
  width: '10px',
  height: '10px',
  borderRadius: '2px',
  display: 'inline-block',
} as const;
