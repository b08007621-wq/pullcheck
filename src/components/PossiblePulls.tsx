import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useSetCards } from '@/hooks/useSetCards';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatMoney, getMarketPrice } from '@/utils/price';

import { SectionPanel } from './SectionPanel';

type Props = {
  set: SetInfo;
  pulledIds: Set<string>;
};

const COLUMNS = 3;
const LIMIT = 12;
const CARD_RATIO = 63 / 88;

export function PossiblePulls({ set, pulledIds }: Props) {
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { cards } = useSetCards(set.id);
  const top = useMemo(
    () =>
      (cards ?? [])
        .flatMap((card) => {
          const price = getMarketPrice(card);
          return price?.currency === 'USD' ? [{ card, price: price.amount }] : [];
        })
        .sort((first, second) => second.price - first.price)
        .slice(0, LIMIT),
    [cards],
  );
  const tile = Math.floor((Math.min(width, 640) - spacing.lg * 4 - spacing.sm * (COLUMNS - 1)) / COLUMNS);

  return (
    <SectionPanel title="Possible pulls">
      <Text style={styles.note}>{`Top hits in ${set.name}`}</Text>
      {cards === null ? (
        <Text style={styles.note}>Loading…</Text>
      ) : (
        <View style={styles.grid}>
          {top.map(({ card, price }) => {
            const pulled = pulledIds.has(card.id);
            return (
              <View key={card.id} style={{ width: tile }}>
                <View>
                  <Image
                    source={card.images.small}
                    style={[styles.image, { width: tile, height: tile / CARD_RATIO }, pulled && styles.pulled]}
                    contentFit="contain"
                    recyclingKey={card.id}
                  />
                  {pulled ? (
                    <View style={styles.badge}>
                      <Ionicons name="checkmark" size={14} color={styles.badgeIcon.color} />
                    </View>
                  ) : null}
                </View>
                <Text style={styles.price}>{formatMoney(price, 'USD')}</Text>
              </View>
            );
          })}
        </View>
      )}
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    note: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginBottom: spacing.sm,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    image: {
      borderRadius: radius.sm - 2,
    },
    pulled: {
      borderWidth: 2,
      borderColor: theme.colors.gain,
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.gain,
    },
    badgeIcon: {
      color: theme.colors.background,
    },
    price: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      marginTop: 2,
    },
  });
}
