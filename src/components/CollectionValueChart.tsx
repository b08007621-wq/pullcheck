import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem, ValuePoint } from '@/types/collection';
import { itemTitle } from '@/utils/collectionValue';
import { type ChartRange, findMovers, type Mover, RANGES, valuePointsInRange } from '@/utils/movers';
import { formatMoney } from '@/utils/price';

import { PriceChange } from './PriceChange';
import { PriceHistoryChart } from './PriceHistoryChart';
import { SectionPanel } from './SectionPanel';
import { SegmentedControl } from './SegmentedControl';

type Props = {
  items: CollectionItem[];
  history: ValuePoint[];
  onOpen: (item: CollectionItem) => void;
};

export function CollectionValueChart({ items, history, onOpen }: Props) {
  const styles = useThemedStyles(createStyles);
  const [range, setRange] = useState<ChartRange>('30d');
  const points = useMemo(() => valuePointsInRange(history, range), [history, range]);
  const { gainers, losers } = useMemo(() => findMovers(items, range), [items, range]);

  return (
    <SectionPanel title="Value over time">
      <View style={styles.range}>
        <SegmentedControl options={RANGES} value={range} onChange={setRange} />
      </View>
      <PriceHistoryChart
        points={points}
        currency="USD"
        height={120}
        emptyMessage="The chart fills in as PullCheck records your collection’s value each day."
      />
      {gainers.length > 0 || losers.length > 0 ? (
        <View style={styles.movers}>
          <MoverColumn title="Top gainers" movers={gainers} onOpen={onOpen} />
          <MoverColumn title="Top losers" movers={losers} onOpen={onOpen} />
        </View>
      ) : null}
    </SectionPanel>
  );
}

function MoverColumn({ title, movers, onOpen }: { title: string; movers: Mover[]; onOpen: (item: CollectionItem) => void }) {
  const styles = useThemedStyles(createStyles);
  if (movers.length === 0) return null;
  return (
    <View style={styles.column}>
      <Text style={styles.columnTitle}>{title}</Text>
      {movers.map((mover) => {
        const item = mover.item;
        const image = item.kind === 'card' ? item.card.images.small : item.product.imageUrl;
        return (
          <Pressable
            key={item.key}
            onPress={() => onOpen(item)}
            accessibilityRole="button"
            accessibilityLabel={itemTitle(item)}
            style={({ pressed }) => [styles.mover, pressed && styles.pressed]}
          >
            <Image source={image} style={styles.thumb} contentFit="contain" recyclingKey={item.key} />
            <View style={styles.moverInfo}>
              <Text style={styles.moverName} numberOfLines={1}>
                {itemTitle(item)}
              </Text>
              <View style={styles.moverRow}>
                <Text style={[styles.amount, mover.amount >= 0 ? styles.gain : styles.loss]}>
                  {`${mover.amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(mover.amount))}`}
                </Text>
                {mover.percent !== null ? <PriceChange percent={mover.percent} /> : null}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    range: {
      paddingBottom: spacing.md,
    },
    movers: {
      gap: spacing.md,
      paddingTop: spacing.md,
    },
    column: {
      gap: spacing.xs,
    },
    columnTitle: {
      ...typography.label,
      color: theme.colors.text,
    },
    mover: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 4,
      borderRadius: radius.sm,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    thumb: {
      width: 30,
      height: 42,
    },
    moverInfo: {
      flex: 1,
      gap: 2,
    },
    moverName: {
      ...typography.caption,
      color: theme.colors.text,
    },
    moverRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    amount: {
      ...typography.caption,
      fontWeight: '600',
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
