import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

export const CalloutRenderer = memo(function CalloutRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'callout') return null;
  if (componentState?.values.dismissed) return null;

  const variant = component.variant ?? 'info';
  const accent = colors[variant];
  const bg = colors[`${variant}Bg` as const];

  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: bg,
        borderLeftWidth: 4,
        borderLeftColor: accent,
        borderRadius: radius.sm,
        padding: spacing.md,
        marginVertical: spacing.sm,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
      }}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        {component.title ? (
          <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.label }}>
            {component.title}
          </Text>
        ) : null}
        <Text
          style={{ color: colors.text, fontSize: fontSize.body, lineHeight: fontSize.body * 1.5 }}
        >
          {component.content}
        </Text>
      </View>
      {component.dismissible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() =>
            dispatch({
              type: 'FIELD_CHANGED',
              componentId: component.id,
              field: 'dismissed',
              value: true,
            })
          }
        >
          <Text style={{ color: colors.textMuted, fontSize: fontSize.title }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
});
