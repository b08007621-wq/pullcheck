import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { CollectionSort } from '@/types/collection';

import { GlassSurface } from './GlassSurface';

type Props = {
  value: CollectionSort;
  onChange: (value: CollectionSort) => void;
  compact?: boolean;
};

const LABEL: Record<CollectionSort, string> = {
  value: 'Value',
  recent: 'Recent',
};

const DESCRIPTION: Record<CollectionSort, string> = {
  value: 'highest value',
  recent: 'recently added',
};

export function SortToggle({ value, onChange, compact = false }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <GlassSurface style={styles.container} interactive>
      <Pressable
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Sorted by ${DESCRIPTION[value]}. Tap to change.`}
        onPress={() => {
          haptics.selection();
          onChange(value === 'value' ? 'recent' : 'value');
        }}
      >
        <Ionicons name={value === 'value' ? 'trending-up' : 'time-outline'} size={15} color={theme.colors.textMuted} />
        {compact ? null : <Text style={[styles.text, { color: theme.colors.textMuted }]}>{LABEL[value]}</Text>}
      </Pressable>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
  },
  text: {
    ...typography.label,
    fontSize: 14,
  },
});
