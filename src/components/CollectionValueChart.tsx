import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { ChartCards, CollectionItem, ValuePoint } from '@/types/collection';
import { itemTitle } from '@/utils/collectionValue';
import { type ChartRange, findMovers, type Mover, RANGES, valuePointsInRange } from '@/utils/movers';
import { formatMoney } from '@/utils/price';

import { PriceHistoryChart } from './PriceHistoryChart';

type Props = {
  items: CollectionItem[];
  history: ValuePoint[];
  onOpen: (item: CollectionItem) => void;
  chartHeight?: number;
  cards?: ChartCards;
  showRanges?: boolean;
  defaultRange?: ChartRange;
  onCardsChange?: (cards: ChartCards) => void;
};

const CARD_CYCLE: ChartCards[] = ['both', 'gainers', 'losers', 'off'];
const CARD_LABEL: Record<ChartCards, string> = { both: 'Cards', gainers: 'Risers', losers: 'Fallers', off: 'No cards' };

export function CollectionValueChart({
  items,
  history,
  onOpen,
  chartHeight = 110,
  cards = 'both',
  showRanges = true,
  defaultRange = '30d',
  onCardsChange,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [range, setRange] = useState<ChartRange>(defaultRange);
  const points = useMemo(() => valuePointsInRange(history, range), [history, range]);
  const movers = useMemo(() => {
    if (cards === 'off') return [];
    const { gainers, losers } = findMovers(items, range);
    return cards === 'gainers' ? gainers : cards === 'losers' ? losers : [...gainers, ...losers];
  }, [items, range, cards]);

  return (
    <View style={styles.wrap}>
      <PriceHistoryChart points={points} currency="USD" height={chartHeight} emptyMessage="Builds up daily." />
      {showRanges || onCardsChange ? (
        <View style={styles.controls}>
          <View style={styles.ranges}>
            {showRanges
              ? RANGES.map((option) => {
                  const selected = option.value === range;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        haptics.selection();
                        setRange(option.value);
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      hitSlop={6}
                      style={[styles.range, selected && styles.rangeSelected]}
                    >
                      <Text style={[styles.rangeText, selected && styles.rangeTextSelected]}>{option.label}</Text>
                    </Pressable>
                  );
                })
              : null}
          </View>
          {onCardsChange ? (
            <Pressable
              onPress={() => {
                haptics.selection();
                onCardsChange(CARD_CYCLE[(CARD_CYCLE.indexOf(cards) + 1) % CARD_CYCLE.length] ?? 'both');
              }}
              accessibilityRole="button"
              accessibilityLabel={`Cards under the chart: ${CARD_LABEL[cards]}. Tap to change.`}
              hitSlop={6}
              style={styles.cardsToggle}
            >
              <Ionicons name={cards === 'off' ? 'eye-off-outline' : 'eye-outline'} size={14} color={styles.rangeText.color} />
              <Text style={styles.rangeText}>{CARD_LABEL[cards]}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {movers.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.movers}>
          {movers.map((mover) => (
            <MoverChip key={mover.item.key} mover={mover} onOpen={onOpen} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}

function MoverChip({ mover, onOpen }: { mover: Mover; onOpen: (item: CollectionItem) => void }) {
  const styles = useThemedStyles(createStyles);
  const item = mover.item;
  const image = item.kind === 'card' ? item.card.images.small : item.product.imageUrl;
  const up = mover.amount >= 0;
  return (
    <Pressable
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${itemTitle(item)} ${up ? 'up' : 'down'} ${formatMoney(Math.abs(mover.amount))}`}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      <Image source={image} style={styles.thumb} contentFit="contain" recyclingKey={item.key} />
      <View>
        <Text style={styles.chipName} numberOfLines={1}>
          {itemTitle(item)}
        </Text>
        <Text style={[styles.chipAmount, up ? styles.gain : styles.loss]}>
          {`${up ? '▲' : '▼'} ${formatMoney(Math.abs(mover.amount))}`}
        </Text>
      </View>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    ranges: {
      flexDirection: 'row',
      gap: spacing.xs,
      flexShrink: 1,
    },
    cardsToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.surface,
    },
    range: {
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      borderRadius: radius.pill,
    },
    rangeSelected: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    rangeText: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
    },
    rangeTextSelected: {
      color: theme.colors.text,
    },
    movers: {
      gap: spacing.sm,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: spacing.md,
      borderRadius: radius.md,
      backgroundColor: theme.colors.surface,
      maxWidth: 200,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    thumb: {
      width: 26,
      height: 36,
    },
    chipName: {
      ...typography.caption,
      color: theme.colors.text,
      maxWidth: 140,
    },
    chipAmount: {
      ...typography.caption,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    loss: {
      color: theme.colors.loss,
    },
  });
}
