import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

type Props = {
  message?: string;
  bottomInset?: number;
};

export function LoadingState({ message, bottomInset = 0 }: Props) {
  const theme = useTheme();

  return (
    <View
      style={[styles.container, { paddingBottom: spacing.xxl + bottomInset }]}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
    >
      <ActivityIndicator size="large" color={theme.colors.accent} />
      {message ? <Text style={[styles.message, { color: theme.colors.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  message: {
    ...typography.body,
  },
});
