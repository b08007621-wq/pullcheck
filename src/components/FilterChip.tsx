import { StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';

import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  count?: number;
};

export function FilterChip({ label, selected, onPress, count }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <PressableScale
      onPress={() => {
        haptics.selection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      scaleTo={0.95}
      hitSlop={3}
    >
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? theme.colors.text : theme.colors.surfaceRaised,
          },
        ]}
      >
        <Text style={[styles.label, { color: selected ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>
          {label}
        </Text>
        {count !== undefined ? (
          <Text style={[styles.count, { color: selected ? theme.colors.background : theme.colors.textFaint }]}>
            {count}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    maxWidth: 260,
  },
  label: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '600',
  },
  count: {
    ...typography.caption,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
});
