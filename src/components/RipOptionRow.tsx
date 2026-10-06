import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/price';
import type { RipOption } from '@/utils/rip';

type Props = {
  option: RipOption;
  selected: boolean;
  onPress: () => void;
};

export function RipOptionRow({ option, selected, onPress }: Props) {
  const styles = useThemedStyles(createStyles);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${option.title}, ${formatMoney(option.cost)}`}
      style={[styles.row, selected && styles.selected]}
    >
      <View style={[styles.thumb, option.imageUrl ? styles.thumbProduct : null]}>
        {option.imageUrl ? (
          <Image source={option.imageUrl} style={styles.image} contentFit="contain" />
        ) : (
          <Ionicons name="gift-outline" size={20} color={styles.icon.color} />
        )}
      </View>
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {option.title}
        </Text>
        <Text style={styles.detail} numberOfLines={1}>
          {option.detail}
        </Text>
      </View>
      <Text style={styles.cost}>{formatMoney(option.cost)}</Text>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: 'transparent',
      backgroundColor: theme.colors.surface,
    },
    selected: {
      borderColor: theme.colors.accent,
    },
    thumb: {
      width: 40,
      height: 40,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceRaised,
      overflow: 'hidden',
    },
    thumbProduct: {
      backgroundColor: '#FFFFFF',
    },
    image: {
      width: 36,
      height: 36,
    },
    icon: {
      color: theme.colors.accent,
    },
    text: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    detail: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    cost: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
  });
}
