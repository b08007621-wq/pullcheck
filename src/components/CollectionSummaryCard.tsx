import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { ValuePoint } from '@/types/collection';
import type { CollectionSummary } from '@/utils/collectionValue';
import { formatDateTime, formatRelativeTime } from '@/utils/date';
import { formatMoney, percentChange } from '@/utils/price';

import { PriceStatusChip } from './PriceStatusChip';
import { Sparkline } from './Sparkline';
import { ValueChangePill } from './ValueChangePill';

type Props = {
  summary: CollectionSummary;
  history: ValuePoint[];
  lastRefreshAt: string | null;
  pricesAsOf: string | null;
  refreshing: boolean;
  refreshFailed: boolean;
};

const TREND_POINTS = 30;
const TREND_HEIGHT = 52;

export function CollectionSummaryCard({ summary, history, lastRefreshAt, pricesAsOf, refreshing, refreshFailed }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const [trendWidth, setTrendWidth] = useState(0);
  const [showInfo, setShowInfo] = useState(false);
  const animatedTotal = useAnimatedNumber(summary.totalUsd, motion);
  const trend = history.slice(-TREND_POINTS).map((point) => point.total);
  const change = changeLine(summary);

  const parts = [
    `${summary.cardCount} ${summary.cardCount === 1 ? 'card' : 'cards'}`,
    summary.sealedCount > 0 ? `${summary.sealedCount} sealed` : null,
    summary.paidItems > 0 ? `${formatCompactMoney(summary.paidUsd)} paid` : null,
  ].filter(Boolean);

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.label}>{parts.join(' · ')}</Text>
        <PriceStatusChip
          refreshing={refreshing}
          refreshFailed={refreshFailed}
          pricesAsOf={pricesAsOf}
          lastRefreshAt={lastRefreshAt}
          expanded={showInfo}
          onPress={() => setShowInfo((open) => !open)}
        />
      </View>

      <Text
        style={styles.total}
        numberOfLines={1}
        adjustsFontSizeToFit
        accessibilityLabel={`Total value ${formatMoney(summary.totalUsd)}`}
      >
        {formatMoney(animatedTotal)}
      </Text>

      {change ? <ValueChangePill amount={change.amount} percent={change.percent} caption={change.caption} /> : null}

      {showInfo ? (
        <Text style={styles.info}>
          {infoText({ pricesAsOf, lastRefreshAt, refreshFailed, unpriced: summary.unpricedCount })}
        </Text>
      ) : null}

      {trend.length >= 2 ? (
        <View style={styles.trend} onLayout={(event) => setTrendWidth(event.nativeEvent.layout.width)}>
          <Sparkline
            values={trend}
            width={trendWidth}
            height={TREND_HEIGHT}
            color={(trend[trend.length - 1] ?? 0) >= (trend[0] ?? 0) ? theme.colors.gain : theme.colors.loss}
            surface={theme.colors.surface}
          />
        </View>
      ) : null}

    </View>
  );
}

function formatCompactMoney(amount: number): string {
  if (amount < 10_000) return formatMoney(Math.round(amount)).replace(/\.00$/, '');
  return `$${(amount / 1000).toFixed(amount < 100_000 ? 1 : 0)}k`;
}

function changeLine(summary: CollectionSummary): { amount: number; percent: number | null; caption: string } | null {
  if (summary.paidItems > 0 && summary.paidUsd > 0) {
    return {
      amount: summary.paidNowUsd - summary.paidUsd,
      percent: percentChange(summary.paidUsd, summary.paidNowUsd),
      caption: 'vs cost',
    };
  }
  if (summary.totalAtAddUsd > 0) {
    return {
      amount: summary.comparableNowUsd - summary.totalAtAddUsd,
      percent: percentChange(summary.totalAtAddUsd, summary.comparableNowUsd),
      caption: 'all time',
    };
  }
  return null;
}

function infoText({
  pricesAsOf,
  lastRefreshAt,
  refreshFailed,
  unpriced,
}: {
  pricesAsOf: string | null;
  lastRefreshAt: string | null;
  refreshFailed: boolean;
  unpriced: number;
}): string {
  const parts = [
    pricesAsOf
      ? `TCGplayer market prices from ${formatDateTime(new Date(pricesAsOf))}. They update once a day, around 4 PM ET.`
      : 'TCGplayer market prices update once a day, around 4 PM ET.',
    lastRefreshAt ? `Checked ${formatRelativeTime(lastRefreshAt)}.` : null,
    refreshFailed ? 'Some prices couldn’t update — pull down to try again.' : null,
    unpriced > 0 ? `${unpriced} ${unpriced === 1 ? 'item has' : 'items have'} no USD price and ${unpriced === 1 ? 'isn’t' : 'aren’t'} counted.` : null,
  ];
  return parts.filter(Boolean).join(' ');
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      paddingHorizontal: spacing.xs,
      gap: spacing.xs,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    label: {
      ...typography.caption,
      fontSize: 15,
      color: theme.colors.textMuted,
      flexShrink: 1,
    },
    total: {
      ...typography.title,
      fontSize: 44,
      letterSpacing: 0,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    info: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 17,
      color: theme.colors.textFaint,
    },
    trend: {
      height: TREND_HEIGHT,
      marginTop: spacing.sm,
    },
  });
}
