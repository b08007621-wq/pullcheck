import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

type Props = {
  state: 'refreshing' | 'failed';
  onRetry: () => void;
};

export function RefreshNotice({ state, onRetry }: Props) {
  const theme = useTheme();

  if (state === 'refreshing') {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={theme.colors.textMuted} />
        <Text style={[styles.text, { color: theme.colors.textMuted }]}>Fetching the latest details…</Text>
      </View>
    );
  }

  return (
    <Pressable style={styles.row} onPress={onRetry} accessibilityRole="button">
      <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.danger} />
      <Text style={[styles.text, { color: theme.colors.textMuted }]}>
        Showing saved details. <Text style={{ color: theme.colors.accent }}>Tap to refresh</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.caption,
  },
});
