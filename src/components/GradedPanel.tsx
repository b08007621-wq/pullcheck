import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import type { GradedPrice } from '@/services/graded';
import { type AppTheme, spacing, typography } from '@/theme';
import { formatMoney } from '@/utils/price';

import { SectionPanel } from './SectionPanel';

type Props = {
  prices: GradedPrice[] | null;
};

const PREVIEW = 4;

export function GradedPanel({ prices }: Props) {
  const styles = useThemedStyles(createStyles);
  const [open, setOpen] = useState(false);
  if (!prices || prices.length === 0) return null;
  const shown = open ? prices : prices.slice(0, PREVIEW);

  return (
    <SectionPanel title="Graded">
      {shown.map((entry) => (
        <View key={entry.key} style={styles.row}>
          <Text style={styles.label}>{entry.label}</Text>
          <Text style={styles.sales}>{`${entry.sales} sold`}</Text>
          {entry.trend === 'up' || entry.trend === 'down' ? (
            <Ionicons
              name={entry.trend === 'up' ? 'trending-up' : 'trending-down'}
              size={14}
              color={entry.trend === 'up' ? styles.gain.color : styles.loss.color}
            />
          ) : null}
          <Text style={styles.price}>{formatMoney(entry.price, 'USD')}</Text>
        </View>
      ))}
      {prices.length > PREVIEW ? (
        <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.more}>{open ? 'Less' : `All ${prices.length} grades`}</Text>
        </Pressable>
      ) : null}
      <Text style={styles.source}>eBay sales via PokemonPriceTracker</Text>
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 7,
    },
    label: {
      ...typography.label,
      color: theme.colors.text,
      width: 72,
    },
    sales: {
      ...typography.caption,
      color: theme.colors.textFaint,
      flex: 1,
    },
    price: {
      ...typography.label,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    loss: {
      color: theme.colors.loss,
    },
    more: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.accent,
      paddingTop: spacing.xs,
    },
    source: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textFaint,
      paddingTop: spacing.xs,
    },
  });
}
