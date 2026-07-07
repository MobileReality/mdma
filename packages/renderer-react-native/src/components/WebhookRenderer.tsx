import { memo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

/**
 * Webhook status view. Mirrors the web renderer: dispatches `INTEGRATION_CALLED`
 * with the request shape when triggered (real HTTP execution is the host's job).
 */
export const WebhookRenderer = memo(function WebhookRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;
  const [triggered, setTriggered] = useState(false);

  if (component.type !== 'webhook') return null;

  const status = (componentState?.values.status as string) ?? 'idle';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        marginVertical: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
      }}
    >
      {component.label ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.small }}>{component.label}</Text>
      ) : null}
      <Text style={{ color: colors.text, fontSize: fontSize.body, flex: 1 }}>
        Webhook: {triggered ? 'triggered' : status}
      </Text>
      {!triggered && status === 'idle' ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setTriggered(true);
            dispatch({
              type: 'INTEGRATION_CALLED',
              componentId: component.id,
              integrationId: 'webhook',
              result: { status: 'triggered', url: component.url, method: component.method },
            });
          }}
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.sm,
            paddingVertical: spacing.xs,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Text style={{ color: colors.onPrimary, fontSize: fontSize.small, fontWeight: '600' }}>
            Trigger
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});
