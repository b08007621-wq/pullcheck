import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Game } from '@/types/card';
import type { CollectionItem } from '@/types/collection';
import { gameTotals } from '@/utils/collectionQuery';
import { gameInfo } from '@/utils/game';
import { formatMoney } from '@/utils/price';

import { GameEmblem } from './GameEmblem';
import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  items: CollectionItem[];
  selected: Game | 'all';
  onSelect: (game: Game | 'all') => void;
};

export function CollectionGamesPanel({ items, selected, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
  const totals = useMemo(() => gameTotals(items), [items]);
  const top = Math.max(...totals.map((total) => total.value), 0);
  if (totals.length < 2) return null;

  return (
    <GlassSurface style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Your games</Text>
        {selected !== 'all' ? (
          <PressableScale onPress={() => onSelect('all')} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.clear}>Show all</Text>
          </PressableScale>
        ) : null}
      </View>
      {totals.map((total) => {
        const active = selected === total.game;
        return (
          <PressableScale
            key={total.game}
            onPress={() => onSelect(active ? 'all' : total.game)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${gameInfo(total.game).label}, ${total.count} items, ${formatMoney(total.value)}`}
            scaleTo={0.98}
          >
            <View style={[styles.row, active && styles.rowActive]}>
              <GameEmblem game={total.game} size={26} />
              <View style={styles.info}>
                <View style={styles.line}>
                  <Text style={styles.name} numberOfLines={1}>
                    {gameInfo(total.game).short}
                  </Text>
                  <Text style={styles.value}>{formatMoney(total.value)}</Text>
                </View>
                <View style={styles.track}>
                  <View style={[styles.bar, { width: `${top > 0 ? Math.max(4, (total.value / top) * 100) : 4}%` }]} />
                </View>
                <Text style={styles.count}>{total.count === 1 ? '1 item' : `${total.count} items`}</Text>
              </View>
            </View>
          </PressableScale>
        );
      })}
    </GlassSurface>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      padding: spacing.md,
      gap: spacing.sm,
      borderRadius: radius.lg,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    title: {
      ...typography.heading,
      fontSize: 17,
      color: theme.colors.text,
    },
    clear: {
      ...typography.label,
      color: theme.colors.accent,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.sm,
      borderRadius: radius.md,
    },
    rowActive: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    info: {
      flex: 1,
      gap: 4,
    },
    line: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    name: {
      ...typography.label,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    value: {
      ...typography.label,
      fontWeight: '700',
      color: theme.colors.price,
    },
    track: {
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.colors.surfaceRaised,
      overflow: 'hidden',
    },
    bar: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: theme.colors.accent,
    },
    count: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
}
