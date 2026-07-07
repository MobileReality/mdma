import { memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { MdmaBlockRendererProps } from '../renderers/renderer-registry.js';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

/**
 * Emits the same store actions as the web renderer: approve → `APPROVAL_GRANTED`
 * (with `actor`), deny → `APPROVAL_DENIED` (with `actor` + `reason`).
 */
export const ApprovalGateRenderer = memo(function ApprovalGateRenderer({
  component,
  componentState,
  dispatch,
}: MdmaBlockRendererProps) {
  const theme = useMdmaTheme();
  const { colors, spacing, radius, fontSize } = theme;

  if (component.type !== 'approval-gate') return null;

  const status = (componentState?.values.status as string) ?? 'pending';

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        marginVertical: spacing.sm,
        gap: spacing.sm,
      }}
    >
      <Text style={{ fontWeight: '700', color: colors.text, fontSize: fontSize.title }}>
        {component.title}
      </Text>
      {component.description ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSize.body }}>
          {component.description}
        </Text>
      ) : null}
      <Text style={{ color: colors.text, fontSize: fontSize.body }}>
        Status: <Text style={{ fontWeight: '700' }}>{status}</Text>
      </Text>

      {status === 'pending' ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              dispatch({
                type: 'APPROVAL_GRANTED',
                componentId: component.id,
                actor: { id: 'current-user' },
              })
            }
            style={{
              backgroundColor: colors.primary,
              borderRadius: radius.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '600' }}>Approve</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() =>
              dispatch({
                type: 'APPROVAL_DENIED',
                componentId: component.id,
                actor: { id: 'current-user' },
                reason: '',
              })
            }
            style={{
              backgroundColor: colors.danger,
              borderRadius: radius.sm,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.md,
            }}
          >
            <Text style={{ color: colors.onDanger, fontWeight: '600' }}>Deny</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});
