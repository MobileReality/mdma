import { memo } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useMdmaTheme } from '../theme/MdmaThemeProvider.js';

export interface MdmaBlockLoadingProps {
  node?: { value?: string };
}

/** Skeleton shown while an MDMA block is still streaming / failing to validate. */
export const MdmaBlockLoading = memo(function MdmaBlockLoading(_props: MdmaBlockLoadingProps) {
  const theme = useMdmaTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        marginVertical: theme.spacing.xs,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.md,
      }}
    >
      <ActivityIndicator size="small" color={theme.colors.textMuted} />
      <Text style={{ color: theme.colors.textMuted, fontSize: theme.fontSize.small }}>
        Loading…
      </Text>
    </View>
  );
});
