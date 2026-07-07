import { memo, useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

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
 * Chart renders as a table by default (parity with the web renderer — no
 * charting dependency in the base package). Swap in a real chart
 * (`react-native-svg` / `victory-native`) via `customizations`. See plan Q6.
 */
export const ChartRenderer = memo(function ChartRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  const data = useMemo(() => {
    if (component.type !== 'chart') return { headers: [], rows: [] };
    const raw = component.data;
    if (typeof raw === 'string' && raw.startsWith('{{')) {
      const resolved = resolveBinding(raw);
      return typeof resolved === 'string' ? parseCsvData(resolved) : { headers: [], rows: [] };
    }
    return parseCsvData(raw as string);
  }, [component, resolveBinding]);

  if (component.type !== 'chart') return null;

  return (
    <View style={{ marginVertical: spacing.sm, gap: spacing.xs }}>
      {component.label ? (
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.title }}>
          {component.label}
        </Text>
      ) : null}
      <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>
        {component.variant ?? 'line'} chart
      </Text>

      {data.rows.length === 0 ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>No chart data</Text>
      ) : (
        <ScrollView horizontal style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm }}>
          <View>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
              {data.headers.map((h) => (
                <View key={h} style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 100 }}>
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.small }}>{h}</Text>
                </View>
              ))}
            </View>
            {data.rows.map((row, i) => (
              <View key={i} style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}>
                {data.headers.map((h) => (
                  <View key={h} style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 100 }}>
                    <Text style={{ color: colors.text, fontSize: fontSize.small }}>{String(row[h] ?? '')}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
});
