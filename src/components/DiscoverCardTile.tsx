import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, typography } from '@/theme';
import type { DiscoverPick } from '@/services/discover';
import { formatMoney } from '@/utils/price';

import { PressableScale } from './PressableScale';

type Props = {
  pick: DiscoverPick;
  badge: 'none' | 'change' | 'under';
  onPress: (pick: DiscoverPick) => void;
};

export const TILE_WIDTH = 116;

function DiscoverCardTileView({ pick, badge, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const { card, price, change } = pick;
  const label =
    badge === 'change' && change !== null
      ? `+${Math.round(change * 100)}%`
      : badge === 'under' && change !== null
        ? `${Math.round(Math.abs(change) * 100)}% under`
        : null;

  return (
    <PressableScale
      onPress={() => onPress(pick)}
      accessibilityRole="button"
      accessibilityLabel={`${card.name}, ${card.set.name}, ${formatMoney(price)}${label ? `, ${label}` : ''}`}
      style={styles.tile}
    >
      <Image
        source={card.images.small}
        style={styles.image}
        contentFit="cover"
        recyclingKey={card.id}
        transition={150}
        accessibilityIgnoresInvertColors
      />
      <Text style={styles.name} numberOfLines={1}>
        {card.name}
      </Text>
      <View style={styles.row}>
        <Text style={styles.price}>{formatMoney(price)}</Text>
        {label ? <Text style={[styles.badge, badge === 'change' ? styles.gain : styles.accent]}>{label}</Text> : null}
      </View>
    </PressableScale>
  );
}

export const DiscoverCardTile = memo(DiscoverCardTileView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tile: {
      width: TILE_WIDTH,
      gap: 3,
    },
    image: {
      width: TILE_WIDTH,
      height: TILE_WIDTH / (63 / 88),
      borderRadius: radius.sm + 2,
      backgroundColor: theme.colors.surfaceRaised,
      marginBottom: 3,
    },
    name: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 4,
    },
    price: {
      ...typography.caption,
      fontWeight: '800',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    badge: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    accent: {
      color: theme.colors.accent,
    },
  });
}
