import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import { type Currency, formatMoney, type PriceRow } from '@/utils/price';

type Props = {
  title?: string;
  rows: PriceRow[];
  currency: Currency;
};

export function PriceTable({ title, rows, currency }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.table}>
      {title ? <Text style={[styles.title, { color: theme.colors.textMuted }]}>{title}</Text> : null}
      {rows.map((row, index) => (
        <View
          key={row.label}
          style={[styles.row, index > 0 && { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}
        >
          <Text style={[styles.label, { color: theme.colors.textMuted }]}>{row.label}</Text>
          <Text
            style={[
              styles.amount,
              { color: index === 0 ? theme.colors.price : theme.colors.text },
            ]}
          >
            {formatMoney(row.amount, currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: {
    gap: 0,
  },
  title: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  label: {
    ...typography.body,
    fontSize: 15,
  },
  amount: {
    ...typography.label,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
