import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import { formatPrice, type MarketPrice } from '@/utils/price';

type Props = {
  price: MarketPrice | null;
  caption: string;
  emptyMessage: string;
};

export function BigPrice({ price, caption, emptyMessage }: Props) {
  const theme = useTheme();

  if (!price) {
    return <Text style={[styles.empty, { color: theme.colors.textMuted }]}>{emptyMessage}</Text>;
  }

  return (
    <View style={styles.block}>
      <Text style={[styles.amount, { color: theme.colors.price }]}>{formatPrice(price)}</Text>
      <Text style={[styles.caption, { color: theme.colors.textFaint }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
  amount: {
    ...typography.title,
    fontSize: 38,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    ...typography.caption,
  },
  empty: {
    ...typography.body,
  },
});
