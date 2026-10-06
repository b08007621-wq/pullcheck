import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { formatCollectorNumber } from '@/utils/card';
import { formatPrice, getMarketPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';

type Props = {
  cards: Card[];
  onSelect: (card: Card) => void;
};

const THUMB_WIDTH = 84;

export function IdentifyCandidates({ cards, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroller}
    >
      {cards.map((card) => {
        const price = getMarketPrice(card);
        return (
          <PressableScale
            key={card.id}
            onPress={() => onSelect(card)}
            accessibilityRole="button"
            accessibilityLabel={`${card.name}, ${card.set.name}, number ${card.number}`}
            style={styles.item}
          >
            <Image source={card.images.small} style={styles.image} contentFit="contain" recyclingKey={card.id} />
            <Text style={styles.set} numberOfLines={1}>
              {card.set.name}
            </Text>
            <Text style={styles.number} numberOfLines={1}>
              #{formatCollectorNumber(card)}
            </Text>
            <Text style={styles.price} numberOfLines={1}>
              {price ? formatPrice(price) : 'No price'}
            </Text>
          </PressableScale>
        );
      })}
      <View style={styles.endSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroller: {
    alignSelf: 'stretch',
    marginHorizontal: -spacing.lg,
  },
  row: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  item: {
    width: THUMB_WIDTH,
    gap: 2,
  },
  image: {
    width: THUMB_WIDTH,
    height: THUMB_WIDTH / (63 / 88),
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  set: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  number: {
    ...typography.caption,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  price: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '700',
    color: '#5EE6A8',
  },
  endSpacer: {
    width: spacing.xs,
  },
});
