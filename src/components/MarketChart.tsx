import { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { type HistorySource, useLongHistory } from '@/hooks/useLongHistory';
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
  source?: HistorySource | null;
  chartHeight?: number;
};

export function MarketChart({ id, usd, extra = [], estimated = [], source = null, chartHeight = 120 }: Props) {
  const theme = useTheme();
  const recorded = useMarketHistory(id, usd);
  const long = useLongHistory(source);
  const useEstimates = long.length < 2;
  const points = useMemo(
    () =>
      mergePoints(
        useEstimates ? estimated : [],
        long,
        extra.filter((point) => !point.currency || point.currency === 'USD'),
        recorded,
      ),
    [useEstimates, estimated, long, extra, recorded],
  );

  if (usd === null && points.length === 0) return null;

  return (
    <SectionPanel title="Market">
      <PriceHistoryChart points={points} currency="USD" height={chartHeight} emptyMessage="Builds up daily. Check back tomorrow." />
      {useEstimates && estimated.length > 0 ? (
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
