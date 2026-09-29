import { memo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { isDataSourceRef, type TableComponent, type TableColumn } from '@mobile-reality/mdma-spec';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';
import { useDataState, useDocumentStore } from '../hooks/use-document-store.js';

export const TableRenderer = memo(function TableRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();

  if (component.type !== 'table') return null;

  if (isDataSourceRef(component.data)) {
    return <DataDrivenTable component={component} theme={theme} />;
  }

  const rawData =
    typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? (rawData as Record<string, unknown>[]) : [];

  return <TableGrid component={component} data={data} theme={theme} resolveBinding={resolveBinding} />;
});

function DataDrivenTable({
  component,
  theme,
}: {
  component: TableComponent;
  theme: ReturnType<typeof useMdmaTheme>;
}) {
  const { colors, spacing, fontSize } = theme;
  const store = useDocumentStore();
  const dataState = useDataState(component.id);

  const isReloading = dataState?.status === 'loading' && dataState.rows.length > 0;
  if (!dataState || (dataState.status === 'loading' && !isReloading)) {
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
          {dataState.error ?? 'Failed to load data'}
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
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>No data</Text>
      </View>
    );
  }

  const pageSize = component.pageSize ?? dataState.pageSize ?? dataState.rows.length;
  const total = dataState.total ?? dataState.rows.length;
  const pageCount = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

  return (
    <View style={{ gap: spacing.xs }} accessibilityState={{ busy: isReloading }}>
      {isReloading ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>Loading…</Text>
      ) : null}
      <TableGrid
        component={component}
        data={dataState.rows as Record<string, unknown>[]}
        theme={theme}
        onSort={(key) => {
          const next =
            dataState.sort?.key === key && dataState.sort.direction === 'asc'
              ? { key, direction: 'desc' as const }
              : { key, direction: 'asc' as const };
          store.setDataSort(component.id, next);
        }}
      />
      {pageCount > 1 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
          <Pressable
            accessibilityRole="button"
            disabled={dataState.page <= 1}
            onPress={() => store.setDataPage(component.id, dataState.page - 1)}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.small }}>Prev</Text>
          </Pressable>
          <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>
            Page {dataState.page} / {pageCount}
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={dataState.page >= pageCount}
            onPress={() => store.setDataPage(component.id, dataState.page + 1)}
          >
            <Text style={{ color: colors.primary, fontSize: fontSize.small }}>Next</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function TableGrid({
  component,
  data,
  theme,
  onSort,
  resolveBinding,
}: {
  component: TableComponent;
  data: Record<string, unknown>[];
  theme: ReturnType<typeof useMdmaTheme>;
  onSort?: (key: string) => void;
  resolveBinding?: (expr: string) => unknown;
}) {
  const { colors, spacing, radius, fontSize } = theme;
  const sensitiveKeys = new Set(
    component.columns.filter((col) => col.sensitive).map((col) => col.key),
  );

  const cellBase = {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    minWidth: 120,
    justifyContent: 'center' as const,
  };

  return (
    <View style={{ marginVertical: spacing.sm, gap: spacing.xs }}>
      {component.label ? (
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.title }}>
          {component.label}
        </Text>
      ) : null}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        style={{
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.sm,
          backgroundColor: colors.background,
        }}
      >
        <View style={{ backgroundColor: colors.background }}>
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
            {component.columns.map((col: TableColumn) => {
              const HeaderCell = onSort && col.sortable ? Pressable : View;
              return (
                <HeaderCell
                  key={col.key}
                  style={cellBase}
                  {...(onSort && col.sortable
                    ? { onPress: () => onSort(col.key), accessibilityRole: 'button' as const }
                    : {})}
                >
                  <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.small }}>
                    {col.header}
                    {col.sensitive ? ' 🔒' : ''}
                  </Text>
                </HeaderCell>
              );
            })}
          </View>
          {data.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {component.columns.map((col: TableColumn) => {
                const raw = row[col.key] ?? '';
                const resolved =
                  resolveBinding && typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw)
                    ? resolveBinding(raw)
                    : raw;
                const value = String(resolved ?? '');
                const masked = sensitiveKeys.has(col.key) && value;
                return (
                  <View key={col.key} style={cellBase}>
                    <Text style={{ color: colors.text, fontSize: fontSize.small }}>
                      {masked ? '•••••' : value}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
          {data.length === 0 ? (
            <View style={{ padding: spacing.sm }}>
              <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>No data</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
