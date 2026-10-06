import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import { formatRelativeTime, formatShortDate } from '@/utils/date';

type Props = {
  refreshing: boolean;
  refreshFailed: boolean;
  pricesAsOf: string | null;
  lastRefreshAt: string | null;
  expanded: boolean;
  onPress: () => void;
};

export function PriceStatusChip({ refreshing, refreshFailed, pricesAsOf, lastRefreshAt, expanded, onPress }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const asOf = pricesAsOf ? new Date(pricesAsOf) : null;
  const label = refreshing
    ? 'Updating'
    : refreshFailed
      ? 'Update failed'
      : asOf && !Number.isNaN(asOf.getTime())
        ? `${formatShortDate(asOf)} prices`
        : lastRefreshAt
          ? `Checked ${formatRelativeTime(lastRefreshAt)}`
          : 'Prices';
  const dot = refreshFailed ? theme.colors.danger : theme.colors.gain;

  return (
    <Pressable
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={`${label}. Tap for price details.`}
      style={({ pressed }) => [
        styles.chip,
        { backgroundColor: theme.colors.surfaceRaised, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      {refreshing ? (
        <ActivityIndicator size="small" color={theme.colors.textMuted} style={styles.spinner} />
      ) : (
        <View style={[styles.dot, { backgroundColor: dot }]} />
      )}
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label}</Text>
      <Ionicons name={expanded ? 'chevron-up' : 'information-circle-outline'} size={13} color={theme.colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  spinner: {
    transform: [{ scale: 0.6 }],
    width: 10,
    height: 10,
  },
  label: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '600',
  },
});
