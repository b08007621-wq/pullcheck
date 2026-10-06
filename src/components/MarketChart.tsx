import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useMarketHistory } from '@/hooks/useMarketHistory';
import { useTheme } from '@/hooks/useTheme';
import { mergePoints } from '@/services/marketHistory';
import { typography } from '@/theme';
import type { PricePoint } from '@/types/collection';

import { PriceHistoryChart } from './PriceHistoryChart';
import { SectionPanel } from './SectionPanel';

type Props = {
  id: string;
  usd: number | null;
  extra?: PricePoint[];
  estimated?: PricePoint[];
};

export function MarketChart({ id, usd, extra = [], estimated = [] }: Props) {
  const theme = useTheme();
  const recorded = useMarketHistory(id, usd);
  const points = useMemo(
    () => mergePoints(estimated, extra.filter((point) => !point.currency || point.currency === 'USD'), recorded),
    [estimated, extra, recorded],
  );

  if (usd === null) return null;

  return (
    <SectionPanel title="Market">
      <PriceHistoryChart points={points} currency="USD" height={120} emptyMessage="Builds up daily. Check back tomorrow." />
      {estimated.length > 0 ? (
        <Text style={[styles.note, { color: theme.colors.textFaint }]}>Older points estimated from Cardmarket averages</Text>
      ) : null}
    </SectionPanel>
  );
}

const styles = StyleSheet.create({
  note: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 6,
  },
});
