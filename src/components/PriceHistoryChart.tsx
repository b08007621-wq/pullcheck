import { useState } from 'react';
import { type GestureResponderEvent, type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/theme';
import type { PricePoint } from '@/types/collection';
import { formatShortDate } from '@/utils/date';
import { dateFromKey } from '@/utils/history';
import { type Currency, formatMoney } from '@/utils/price';

import { SPARK_PAD, Sparkline } from './Sparkline';

type Props = {
  points: PricePoint[];
  currency: Currency;
  emptyMessage: string;
  height?: number;
};

const CHART_PAD = SPARK_PAD;
const GUIDES = 3;
const TIP_WIDTH = 116;

export function PriceHistoryChart({ points, currency, emptyMessage, height = 96 }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  if (points.length < 2) {
    return <Text style={[styles.empty, { color: theme.colors.textFaint }]}>{emptyMessage}</Text>;
  }

  const values = points.map((point) => point.amount);
  const shown = points[active ?? points.length - 1] ?? points[points.length - 1];
  const high = Math.max(...values);
  const low = Math.min(...values);
  const first = points[0];
  const last = points[points.length - 1];

  const indexAt = (event: GestureResponderEvent) => {
    if (width <= CHART_PAD * 2) return points.length - 1;
    const ratio = (event.nativeEvent.locationX - CHART_PAD) / (width - CHART_PAD * 2);
    return Math.round(Math.min(Math.max(ratio, 0), 1) * (points.length - 1));
  };

  const track = (event: GestureResponderEvent) => {
    const next = indexAt(event);
    if (next !== active) {
      haptics.selection();
      setActive(next);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.value, { color: theme.colors.text }]}>
          {shown ? formatMoney(shown.amount, currency) : ''}
        </Text>
        <Text style={[styles.caption, { color: theme.colors.textMuted }]}>
          {shown ? (active === null ? 'Latest' : formatShortDate(dateFromKey(shown.date))) : ''}
        </Text>
      </View>
      <View
        style={styles.plot}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={track}
        onResponderMove={track}
        onResponderRelease={() => setActive(null)}
        onResponderTerminate={() => setActive(null)}
        accessibilityRole="image"
        accessibilityLabel={`Price history from ${formatMoney(first?.amount ?? 0, currency)} to ${formatMoney(last?.amount ?? 0, currency)}`}
      >
        <Sparkline
          values={values}
          width={width}
          height={height}
          color={theme.colors.accent}
          surface={theme.colors.surface}
          gridColor={theme.colors.border}
          activeIndex={active}
          guides={GUIDES}
        />
        {Array.from({ length: GUIDES }, (_, index) => {
          const level = CHART_PAD + (index / (GUIDES - 1)) * (height - CHART_PAD * 2);
          const amount = high - (index / (GUIDES - 1)) * (high - low);
          return (
            <Text
              key={index}
              pointerEvents="none"
              style={[styles.guide, { top: level - 14, color: theme.colors.textFaint }]}
            >
              {formatMoney(amount, currency)}
            </Text>
          );
        })}
        {active !== null && shown && width > 0 ? (
          <View
            pointerEvents="none"
            style={[
              styles.tip,
              {
                left: tipLeft(active, points.length, width),
                backgroundColor: theme.colors.surfaceRaised,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.tipValue, { color: theme.colors.text }]}>{formatMoney(shown.amount, currency)}</Text>
            <Text style={[styles.tipDate, { color: theme.colors.textMuted }]}>
              {formatShortDate(dateFromKey(shown.date))}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.caption, { color: theme.colors.textFaint }]}>
          {first ? formatShortDate(dateFromKey(first.date)) : ''}
        </Text>
        <Text style={[styles.caption, { color: theme.colors.textFaint }]}>
          High {formatMoney(high, currency)} · Low {formatMoney(low, currency)}
        </Text>
        <Text style={[styles.caption, { color: theme.colors.textFaint }]}>
          {last ? formatShortDate(dateFromKey(last.date)) : ''}
        </Text>
      </View>
    </View>
  );
}

function tipLeft(index: number, count: number, width: number): number {
  const x = CHART_PAD + (index / Math.max(count - 1, 1)) * (width - CHART_PAD * 2);
  return Math.min(Math.max(x - TIP_WIDTH / 2, 0), width - TIP_WIDTH);
}

const styles = StyleSheet.create({
  plot: {
    position: 'relative',
  },
  guide: {
    position: 'absolute',
    right: 2,
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  tip: {
    position: 'absolute',
    top: -6,
    width: TIP_WIDTH,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  tipValue: {
    ...typography.label,
    fontVariant: ['tabular-nums'],
  },
  tipDate: {
    ...typography.caption,
    fontSize: 11,
  },
  wrap: {
    gap: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  value: {
    ...typography.label,
    fontVariant: ['tabular-nums'],
  },
  caption: {
    ...typography.caption,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  empty: {
    ...typography.caption,
  },
});
