import { memo } from 'react';
import { LayoutAnimation, Platform, Pressable, Text, UIManager, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

// RN has no <details>; enable the LayoutAnimation collapse on Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * Collapsible "thinking" block. Emits `FIELD_CHANGED` on `collapsed` — same as
 * the web renderer — and animates the expand/collapse via `LayoutAnimation`
 * (the native stand-in for `<details>`).
 */
export const ThinkingRenderer = memo(function ThinkingRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'thinking') return null;

  const collapsed =
    (componentState?.values.collapsed as boolean | undefined) ?? component.collapsed ?? true;
  const status = component.status ?? 'done';
  const label = component.label ?? 'Thinking';

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dispatch({
      type: 'FIELD_CHANGED',
      componentId: component.id,
      field: 'collapsed',
      value: !collapsed,
    });
  };

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        marginVertical: spacing.sm,
        overflow: 'hidden',
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        onPress={toggle}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md }}
      >
        <Text style={{ color: colors.textMuted }}>{collapsed ? '▸' : '▾'}</Text>
        <Text style={{ color: colors.text, fontWeight: '600', fontSize: fontSize.label }}>
          {status === 'thinking' ? `${label}…` : label}
        </Text>
      </Pressable>
      {!collapsed ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.md }}>
          <Text style={{ color: colors.text, fontSize: fontSize.body, lineHeight: fontSize.body * 1.5 }}>
            {component.content}
          </Text>
        </View>
      ) : null}
    </View>
  );
});
