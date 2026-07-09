import { memo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

/**
 * RN table: a `View` grid inside a horizontal `ScrollView` so wide tables stay
 * readable on narrow screens (the plan's documented constraint). Sensitive
 * columns are masked (parity with the web renderer).
 */
export const TableRenderer = memo(function TableRenderer({
  component,
  resolveBinding,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'table') return null;

  const rawData =
    typeof component.data === 'string' ? resolveBinding(component.data) : component.data;
  const data = Array.isArray(rawData) ? (rawData as Record<string, unknown>[]) : [];
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
          {/* Header */}
          <View style={{ flexDirection: 'row', backgroundColor: colors.surface }}>
            {component.columns.map((col) => (
              <View key={col.key} style={cellBase}>
                <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.small }}>
                  {col.header}
                  {col.sensitive ? ' 🔒' : ''}
                </Text>
              </View>
            ))}
          </View>
          {/* Rows */}
          {data.map((row, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              {component.columns.map((col) => {
                const raw = row[col.key] ?? '';
                const resolved =
                  typeof raw === 'string' && /^\{\{.+\}\}$/.test(raw) ? resolveBinding(raw) : raw;
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
});
