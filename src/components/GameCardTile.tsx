import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { formatMoney, getMarketPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';

type Props = {
  card: Card;
  owned: number;
  width: number;
  dimMissing: boolean;
  onPress: (card: Card) => void;
};

function GameCardTileView({ card, owned, width, dimMissing, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = getMarketPrice(card);
  const height = width / (63 / 88);

  return (
    <PressableScale
      onPress={() => onPress(card)}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.number}${owned > 0 ? ', owned' : ''}`}
      style={{ width }}
    >
      <View style={[styles.frame, { height }, owned > 0 && styles.frameOwned]}>
        <Image
          source={card.images.small}
          style={[StyleSheet.absoluteFill, dimMissing && owned === 0 && styles.missing]}
          contentFit="cover"
          recyclingKey={card.id}
          transition={120}
        />
        {owned > 1 ? (
          <View style={styles.count}>
            <Text style={styles.countText}>×{owned}</Text>
          </View>
        ) : owned === 1 ? (
          <View style={styles.check}>
            <Ionicons name="checkmark" size={12} color="#06210F" />
          </View>
        ) : null}
      </View>
      <View style={styles.meta}>
        <Text style={styles.number} numberOfLines={1}>
          {card.rarity ? `${card.number} · ${card.rarity}` : card.number}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {price ? formatMoney(price.amount, price.currency) : '—'}
        </Text>
      </View>
    </PressableScale>
  );
}

export const GameCardTile = memo(GameCardTileView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    frame: {
      borderRadius: radius.sm + 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    frameOwned: {
      borderColor: theme.colors.gain,
    },
    missing: {
      opacity: 0.35,
    },
    count: {
      position: 'absolute',
      top: 4,
      right: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: radius.pill,
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    countText: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '800',
      color: '#FFFFFF',
    },
    check: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 18,
      height: 18,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gain,
    },
    meta: {
      paddingTop: spacing.xs,
      gap: 1,
    },
    number: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    price: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.price,
    },
  });
}
