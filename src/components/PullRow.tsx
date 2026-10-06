import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Pull } from '@/types/rip';
import { formatCollectorNumber } from '@/utils/card';
import { formatPrice, getVariantOptions, variantShortLabel } from '@/utils/price';
import { pullPrice } from '@/utils/rip';

type Props = {
  pull: Pull;
  best: boolean;
  onCycleVariant: (pull: Pull) => void;
  onRemove: (pull: Pull) => void;
};

function PullRowView({ pull, best, onCycleVariant, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = pullPrice(pull);
  const canCycle = getVariantOptions(pull.card).length > 1 && pull.variant !== null;

  return (
    <View style={[styles.row, best && styles.best]}>
      <Image
        source={pull.card.images.small}
        style={styles.image}
        contentFit="contain"
        recyclingKey={pull.id}
        accessibilityIgnoresInvertColors
      />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {pull.card.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {pull.card.set.name} · #{formatCollectorNumber(pull.card)}
        </Text>
        <View style={styles.tags}>
          {best ? (
            <View style={[styles.tag, styles.bestTag]}>
              <Text style={[styles.tagText, styles.bestText]}>Best pull</Text>
            </View>
          ) : null}
          {canCycle && pull.variant ? (
            <Pressable
              onPress={() => onCycleVariant(pull)}
              accessibilityRole="button"
              accessibilityLabel={`${variantShortLabel(pull.variant)}. Change version`}
              hitSlop={8}
              style={styles.tag}
            >
              <Text style={styles.tagText}>{variantShortLabel(pull.variant)}</Text>
              <Ionicons name="swap-horizontal" size={12} color={styles.tagText.color} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <Text style={[styles.price, !price && styles.noPrice]}>{price ? formatPrice(price) : 'No price'}</Text>
      <Pressable
        onPress={() => onRemove(pull)}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${pull.card.name}`}
        hitSlop={10}
      >
        <Ionicons name="close-circle" size={22} color={styles.remove.color} />
      </Pressable>
    </View>
  );
}

export const PullRow = memo(PullRowView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      paddingRight: spacing.md,
      borderRadius: radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    best: {
      borderColor: theme.colors.gain,
      borderWidth: 1,
    },
    image: {
      width: 50,
      height: 70,
      borderRadius: radius.sm,
    },
    info: {
      flex: 1,
      gap: 3,
    },
    name: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    tags: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    tag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surfaceRaised,
    },
    tagText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.textMuted,
    },
    bestTag: {
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.gain,
    },
    bestText: {
      color: theme.colors.gain,
    },
    price: {
      ...typography.label,
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    noPrice: {
      color: theme.colors.textFaint,
      fontWeight: '600',
    },
    remove: {
      color: theme.colors.textFaint,
    },
  });
}
