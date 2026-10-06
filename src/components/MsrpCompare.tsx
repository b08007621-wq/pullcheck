import { StyleSheet, Text } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { typography } from '@/theme';
import type { Msrp } from '@/utils/msrp';
import { formatMoney, formatPercent, type MarketPrice, percentChange } from '@/utils/price';

type Props = {
  msrp: Msrp | null;
  market: MarketPrice | null;
};

export function MsrpCompare({ msrp, market }: Props) {
  const theme = useTheme();
  if (!msrp) return null;

  const change = market ? percentChange(msrp.amount, market.amount) : null;
  const changeColor = change !== null && change < 0 ? theme.colors.loss : theme.colors.gain;

  return (
    <Text style={[styles.text, { color: theme.colors.textFaint }]} numberOfLines={1}>
      MSRP {formatMoney(msrp.amount)}
      {change !== null ? <Text style={{ color: changeColor }}> {formatPercent(change)}</Text> : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    ...typography.caption,
    fontSize: 12,
  },
});
