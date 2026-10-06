import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import { formatMoney, formatPercent } from '@/utils/price';

type Props = {
  amount: number;
  percent: number | null;
  caption: string;
};

export function ValueChangePill({ amount, percent, caption }: Props) {
  const theme = useTheme();
  const flat = Math.abs(amount) < 0.005;
  const color = flat ? theme.colors.textMuted : amount > 0 ? theme.colors.gain : theme.colors.loss;
  const sign = flat ? '' : amount > 0 ? '+' : '−';

  return (
    <View style={styles.row}>
      <Text style={[styles.amount, { color }]}>
        {sign}
        {formatMoney(Math.abs(amount))}
        {percent !== null && !flat ? ` (${formatPercent(percent).replace(/^[+-]/, '')})` : ''}
      </Text>
      <Text style={[styles.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs + 2,
  },
  amount: {
    ...typography.label,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    ...typography.caption,
    fontSize: 15,
    flexShrink: 1,
  },
});
