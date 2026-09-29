import { memo, useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { isDataSourceRef, type ChartComponent } from '@mobile-reality/mdma-spec';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';
import { useDataState, useDocumentStore } from '../hooks/use-document-store.js';

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
  const theme = useMdmaTheme();

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
    return <DataDrivenChart component={component} theme={theme} />;
  }

  const { colors, spacing, radius, fontSize } = theme;

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
        <ScrollView
          horizontal
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.sm,
            backgroundColor: colors.background,
          }}
        >
          <View style={{ backgroundColor: colors.background }}>
            <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
              {data.headers.map((h) => (
                <View
                  key={h}
                  style={{
                    paddingVertical: spacing.xs,
                    paddingHorizontal: spacing.sm,
                    minWidth: 100,
                  }}
                >
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.small }}>
                    {h}
                  </Text>
                </View>
              ))}
            </View>
            {data.rows.map((row, i) => (
              <View
                key={i}
                style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}
              >
                {data.headers.map((h) => (
                  <View
                    key={h}
                    style={{
                      paddingVertical: spacing.xs,
                      paddingHorizontal: spacing.sm,
                      minWidth: 100,
                    }}
                  >
                    <Text style={{ color: colors.text, fontSize: fontSize.small }}>
                      {String(row[h] ?? '')}
                    </Text>
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

function DataDrivenChart({
  component,
  theme,
}: {
  component: ChartComponent;
  theme: ReturnType<typeof useMdmaTheme>;
}) {
  const { colors, spacing, radius, fontSize } = theme;
  const store = useDocumentStore();
  const dataState = useDataState(component.id);

  if (!dataState || dataState.status === 'loading') {
    return (
      <View style={{ padding: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>Loading…</Text>
      </View>
    );
  }
  if (dataState.status === 'error') {
    return (
      <View style={{ padding: spacing.sm, gap: spacing.xs }}>
        <Text style={{ color: colors.text, fontSize: fontSize.small }}>
          {dataState.error ?? 'Failed to load chart data'}
        </Text>
        <Pressable accessibilityRole="button" onPress={() => store.retryData(component.id)}>
          <Text style={{ color: colors.primary, fontSize: fontSize.small }}>Retry</Text>
        </Pressable>
      </View>
    );
  }
  if (dataState.rows.length === 0) {
    return (
      <View style={{ padding: spacing.sm }}>
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>No chart data</Text>
      </View>
    );
  }

  const data = rowsToChartData(dataState.rows);

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
      <ScrollView
        horizontal
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
            {data.headers.map((h) => (
              <View
                key={h}
                style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 100 }}
              >
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.small }}>
                  {h}
                </Text>
              </View>
            ))}
          </View>
          {data.rows.map((row, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: colors.border }}
            >
              {data.headers.map((h) => (
                <View
                  key={h}
                  style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, minWidth: 100 }}
                >
                  <Text style={{ color: colors.text, fontSize: fontSize.small }}>
                    {String(row[h] ?? '')}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
