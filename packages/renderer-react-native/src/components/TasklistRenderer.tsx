import { memo } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

/**
 * Emits `FIELD_CHANGED` per item toggle, and — mirroring the web renderer —
 * `ACTION_TRIGGERED` once on the transition into all-items-checked.
 */
export const TasklistRenderer = memo(function TasklistRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'tasklist') return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        padding: spacing.md,
        marginVertical: spacing.sm,
        gap: spacing.xs,
      }}
    >
      {component.label ? (
        <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.title }}>
          {component.label}
        </Text>
      ) : null}

      {component.items.map((item) => {
        const checked = Boolean(componentState?.values[item.id]);
        const onToggle = (next: boolean) => {
          dispatch({
            type: 'FIELD_CHANGED',
            componentId: component.id,
            field: item.id,
            value: next,
          });
          if (component.onComplete) {
            const wasComplete = component.items.every((it) =>
              Boolean(componentState?.values[it.id]),
            );
            const isComplete = component.items.every((it) =>
              it.id === item.id ? next : Boolean(componentState?.values[it.id]),
            );
            if (!wasComplete && isComplete) {
              dispatch({
                type: 'ACTION_TRIGGERED',
                componentId: component.id,
                actionId: component.onComplete,
              });
            }
          }
        };

        return (
          <Pressable
            key={item.id}
            accessibilityRole="checkbox"
            accessibilityState={{ checked }}
            onPress={() => onToggle(!checked)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingVertical: spacing.xs,
            }}
          >
            <Switch value={checked} onValueChange={onToggle} />
            <Text
              style={{
                color: colors.text,
                fontSize: fontSize.body,
                flex: 1,
                textDecorationLine: checked ? 'line-through' : 'none',
              }}
            >
              {item.text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});
