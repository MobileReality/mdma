import { memo } from 'react';
import { Pressable, Text } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

export const ButtonRenderer = memo(function ButtonRenderer({
  component,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'button') return null;

  const variant = component.variant ?? 'primary';
  const bg =
    variant === 'danger'
      ? colors.danger
      : variant === 'secondary'
        ? colors.secondary
        : variant === 'ghost'
          ? 'transparent'
          : colors.primary;
  const fg =
    variant === 'danger'
      ? colors.onDanger
      : variant === 'secondary'
        ? colors.onSecondary
        : variant === 'ghost'
          ? colors.primary
          : colors.onPrimary;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        if (component.onAction) {
          dispatch({
            type: 'ACTION_TRIGGERED',
            componentId: component.id,
            actionId: component.onAction,
          });
        }
      }}
      style={{
        backgroundColor: bg,
        borderWidth: variant === 'ghost' ? 1 : 0,
        borderColor: colors.border,
        borderRadius: radius.sm,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginVertical: spacing.xs,
      }}
    >
      <Text style={{ color: fg, fontWeight: '600', fontSize: fontSize.body }}>
        {component.text}
      </Text>
    </Pressable>
  );
});
