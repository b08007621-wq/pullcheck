import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing } from '@/theme';
import type { CollectionView } from '@/types/collection';

import { GlassSurface } from './GlassSurface';

type Props = {
  value: CollectionView;
  onChange: (value: CollectionView) => void;
};

const OPTIONS: { value: CollectionView; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { value: 'list', icon: 'list', label: 'Rows' },
  { value: 'grid', icon: 'grid', label: 'Grid' },
  { value: 'cover', icon: 'cube', label: '3D' },
];

export function ViewToggle({ value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <GlassSurface style={styles.container} interactive>
      <View style={styles.row}>
        {OPTIONS.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} view`}
              accessibilityState={{ selected }}
              onPress={() => {
                if (selected) return;
                haptics.selection();
                onChange(option.value);
              }}
              style={[styles.option, selected && { backgroundColor: theme.colors.surfaceRaised }]}
            >
              <Ionicons name={option.icon} size={17} color={selected ? theme.colors.accent : theme.colors.textMuted} />
            </Pressable>
          );
        })}
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.pill,
  },
  row: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
  },
  option: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
  },
});
