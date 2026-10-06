import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem, QuickFilter } from '@/types/collection';
import { collectionStats } from '@/utils/collectionQuery';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';

type Props = {
  items: CollectionItem[];
  onFilter: (filter: QuickFilter) => void;
  onOpen: (item: CollectionItem) => void;
};

export function CollectionQuickStats({ items, onFilter, onOpen }: Props) {
  const styles = useThemedStyles(createStyles);
  const stats = useMemo(() => collectionStats(items), [items]);
  const topPrice = stats.top ? itemPrice(stats.top) : null;

  return (
    <View style={styles.grid}>
      <Tile value={String(stats.unique)} label="Unique items" />
      <Tile
        value={String(stats.extraCopies)}
        label="Extra copies"
        hint={stats.extraCopies > 0 ? 'Tap to see them' : undefined}
        onPress={stats.extraCopies > 0 ? () => onFilter('dupes') : undefined}
      />
      <Tile
        value={String(stats.addedThisWeek)}
        label="Added this week"
        onPress={stats.addedThisWeek > 0 ? () => onFilter('new') : undefined}
      />
      <Tile
        value={topPrice ? formatPrice(topPrice) : '—'}
        label={stats.top ? itemTitle(stats.top) : 'Top card'}
        onPress={stats.top ? () => stats.top && onOpen(stats.top) : undefined}
      />
    </View>
  );
}

function Tile({ value, label, hint, onPress }: { value: string; label: string; hint?: string; onPress?: () => void }) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.cell}>
      <PressableScale
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={`${value} ${label}`}
        accessibilityHint={hint}
        scaleTo={0.96}
      >
        <View style={styles.tile}>
          <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>
            {value}
          </Text>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </View>
      </PressableScale>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    cell: {
      width: '48.5%',
    },
    tile: {
      borderRadius: radius.md,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      gap: 2,
      backgroundColor: theme.colors.surface,
    },
    value: {
      ...typography.heading,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    label: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
