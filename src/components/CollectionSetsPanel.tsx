import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem } from '@/types/collection';
import { setTotals } from '@/utils/collectionQuery';
import { formatMoney } from '@/utils/price';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  items: CollectionItem[];
  selected: string | null;
  onSelect: (set: string | null) => void;
};

export function CollectionSetsPanel({ items, selected, onSelect }: Props) {
  const styles = useThemedStyles(createStyles);
  const totals = useMemo(() => setTotals(items), [items]);
  if (totals.length < 2) return null;
  const top = totals[0]?.value ?? 0;

  return (
    <GlassSurface style={styles.panel}>
      <View style={styles.header}>
        <Text style={styles.title}>Value by set</Text>
        {selected ? (
          <PressableScale onPress={() => onSelect(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.clear}>Show all</Text>
          </PressableScale>
        ) : null}
      </View>
      {totals.map((total) => {
        const active = selected === total.name;
        const percent = Math.max(1, Math.round(total.share * 100));
        return (
          <PressableScale
            key={total.name}
            onPress={() => onSelect(active ? null : total.name)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${total.name}, ${percent} percent of your value, ${formatMoney(total.value)}`}
            scaleTo={0.98}
          >
            <View style={[styles.row, active && styles.rowActive]}>
              <View style={styles.line}>
                <Text style={styles.name} numberOfLines={1}>
                  {total.name}
                </Text>
                <Text style={styles.value}>{formatMoney(total.value)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${top > 0 ? Math.max(4, (total.value / top) * 100) : 4}%` }]} />
              </View>
              <Text style={styles.count}>
                {percent}% of value · {total.count === 1 ? '1 item' : `${total.count} items`}
              </Text>
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
      gap: 4,
      padding: spacing.sm,
      borderRadius: radius.md,
    },
    rowActive: {
      backgroundColor: theme.colors.surfaceRaised,
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
