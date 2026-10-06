import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, typography } from '@/theme';
import { formatPrice, type MarketPrice, priceLabel } from '@/utils/price';

type Props = {
  price: MarketPrice | null;
  caption?: string;
};

export function PriceTag({ price, caption }: Props) {
  const styles = useThemedStyles(createStyles);

  if (!price) {
    return (
      <View style={styles.container}>
        <Text style={styles.missing}>No price</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>{formatPrice(price)}</Text>
      <Text style={styles.caption}>{caption ?? priceLabel(price)}</Text>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    container: {
      alignItems: 'flex-end',
      minWidth: 72,
    },
    amount: {
      ...typography.label,
      color: theme.colors.price,
      fontVariant: ['tabular-nums'],
    },
    caption: {
      ...typography.caption,
      color: theme.colors.textFaint,
      marginTop: 2,
    },
    missing: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
  });
}
