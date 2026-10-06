import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { formatCollectorNumber } from '@/utils/card';
import { getMarketPrice } from '@/utils/price';

import { ListRow, type RowPosition } from './ListRow';
import { OwnedBadge } from './OwnedBadge';
import { PriceTag } from './PriceTag';

type Props = {
  card: Card;
  ownedQuantity: number;
  position: RowPosition;
  onPress: (card: Card) => void;
};

function CardListItemView({ card, ownedQuantity, position, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const details = [`#${formatCollectorNumber(card)}`, card.rarity, card.printing].filter(Boolean).join(' · ');

  return (
    <ListRow position={position} inset={78}>
      <Pressable
        onPress={() => onPress(card)}
        accessibilityRole="button"
        accessibilityLabel={`${card.name}, ${card.set.name}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <Image
          source={card.images.small}
          style={styles.image}
          contentFit="contain"
          transition={150}
          recyclingKey={card.id}
          accessibilityIgnoresInvertColors
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {card.name}
          </Text>
          <Text style={styles.set} numberOfLines={1}>
            {card.set.name}
          </Text>
          <Text style={styles.details} numberOfLines={1}>
            {details}
          </Text>
          {ownedQuantity > 0 ? <OwnedBadge quantity={ownedQuantity} /> : null}
        </View>
        <PriceTag price={getMarketPrice(card)} />
      </Pressable>
    </ListRow>
  );
}

export const CardListItem = memo(CardListItemView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.lg,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    image: {
      width: 54,
      height: 76,
      borderRadius: radius.sm - 2,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.label,
      color: theme.colors.text,
    },
    set: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    details: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
  });
}
