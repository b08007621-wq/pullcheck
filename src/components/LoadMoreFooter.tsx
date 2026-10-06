import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';

import { ActionButton } from './ActionButton';

type Props = {
  isLoading: boolean;
  failed: boolean;
  hasMore: boolean;
  onRetry: () => void;
};

export function LoadMoreFooter({ isLoading, failed, hasMore, onRetry }: Props) {
  const theme = useTheme();
  const textStyle = [styles.text, { color: theme.colors.textFaint }];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.container}>
        <Text style={textStyle}>Couldn’t load more cards.</Text>
        <ActionButton label="Try again" icon="refresh" variant="secondary" onPress={onRetry} />
      </View>
    );
  }

  if (!hasMore) {
    return (
      <View style={styles.container}>
        <Text style={textStyle}>That’s every match.</Text>
      </View>
    );
  }

  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
    minHeight: 72,
  },
  text: {
    ...typography.caption,
  },
});
