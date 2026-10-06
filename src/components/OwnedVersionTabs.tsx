import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';

export type OwnedVersion = {
  key: string;
  label: string;
  quantity: number;
};

type Props = {
  versions: OwnedVersion[];
  selectedKey: string;
  onSelect: (key: string) => void;
};

export function OwnedVersionTabs({ versions, selectedKey, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();

  return (
    <View style={styles.row} accessibilityRole="tablist">
      {versions.map((version) => {
        const selected = version.key === selectedKey;
        return (
          <Pressable
            key={version.key}
            onPress={() => {
              if (selected) return;
              haptics.selection();
              onSelect(version.key);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${version.label}, ${version.quantity} ${version.quantity === 1 ? 'copy' : 'copies'}`}
            style={[styles.tab, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]} numberOfLines={1}>
              {version.label}
            </Text>
            <Text style={[styles.count, selected && styles.selectedLabel]}>×{version.quantity}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    selected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surfaceRaised,
    },
    label: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    count: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
      fontVariant: ['tabular-nums'],
    },
    selectedLabel: {
      color: theme.colors.accent,
    },
  });
}
