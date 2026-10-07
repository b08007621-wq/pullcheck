import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem, ValuePoint } from '@/types/collection';
import { itemTitle } from '@/utils/collectionValue';
import { type ChartRange, findMovers, type Mover, RANGES, valuePointsInRange } from '@/utils/movers';
import { formatMoney } from '@/utils/price';

import { PriceHistoryChart } from './PriceHistoryChart';

type Props = {
  items: CollectionItem[];
  history: ValuePoint[];
  onOpen: (item: CollectionItem) => void;
  chartHeight?: number;
};

export function CollectionValueChart({ items, history, onOpen, chartHeight = 110 }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const [range, setRange] = useState<ChartRange>('30d');
  const points = useMemo(() => valuePointsInRange(history, range), [history, range]);
  const movers = useMemo(() => {
    const { gainers, losers } = findMovers(items, range);
    return [...gainers, ...losers];
  }, [items, range]);

  return (
    <View style={styles.wrap}>
      <PriceHistoryChart points={points} currency="USD" height={chartHeight} emptyMessage="Builds up daily." />
      <View style={styles.ranges}>
        {RANGES.map((option) => {
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
        })}
      </View>
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
    ranges: {
      flexDirection: 'row',
      gap: spacing.xs,
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
