import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';

import { ListRow, type RowPosition } from './ListRow';

type Props = {
  icon: IconName;
  title: string;
  detail: string;
  position: RowPosition;
  highlight?: boolean;
  onPress: () => void;
};

export function ShortcutTile({ icon, title, detail, position, highlight = false, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <ListRow position={position} inset={52}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${detail}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={20} color={styles.icon.color} style={styles.iconBox} />
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.detail, highlight && styles.highlight]} numberOfLines={1}>
          {detail}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={styles.chevron.color} />
      </Pressable>
    </ListRow>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 48,
      paddingHorizontal: spacing.lg,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    iconBox: {
      width: 24,
      marginRight: spacing.xs,
    },
    icon: {
      color: theme.colors.accent,
    },
    title: {
      ...typography.body,
      color: theme.colors.text,
      flex: 1,
    },
    detail: {
      ...typography.body,
      fontSize: 15,
      color: theme.colors.textMuted,
    },
    highlight: {
      color: theme.colors.gain,
      fontWeight: '600',
    },
    chevron: {
      color: theme.colors.textFaint,
    },
  });
}
