import { StyleSheet, Text, View } from 'react-native';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Rip } from '@/types/rip';
import { formatMoney } from '@/utils/price';
import type { RipSummary } from '@/utils/rip';

import { EditableValue } from './EditableValue';
import { FactRow } from './FactRow';
import { PriceChange } from './PriceChange';
import { SectionPanel } from './SectionPanel';

type Props = {
  rip: Rip;
  summary: RipSummary;
  onEditCost: () => void;
};

export function RipSummaryPanel({ rip, summary, onEditCost }: Props) {
  const styles = useThemedStyles(createStyles);
  const shown = useAnimatedNumber(summary.totalUsd, useMotionEnabled());
  const ahead = summary.result >= 0;
  const caption = [
    summary.count === 1 ? '1 card' : `${summary.count} cards`,
    summary.unpriced > 0 ? `${summary.unpriced} without a price` : null,
    'TCGplayer market',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SectionPanel title={rip.title} icon="gift">
      <View style={styles.hero}>
        <Text style={styles.total}>{formatMoney(shown)}</Text>
        <Text style={styles.caption}>{caption}</Text>
      </View>
      {summary.count > 0 ? (
        <View style={[styles.verdict, ahead ? styles.verdictGain : styles.verdictLoss]}>
          <Text style={[styles.verdictText, ahead ? styles.gain : styles.loss]}>
            {ahead ? 'Paid off by ' : 'Short by '}
            {formatMoney(Math.abs(summary.result))}
          </Text>
          {summary.percent !== null ? <PriceChange percent={summary.percent} /> : null}
        </View>
      ) : null}
      <FactRow
        label="Cost"
        value={
          <EditableValue
            value={formatMoney(rip.cost)}
            placeholder="Set cost"
            accessibilityLabel={`Cost ${formatMoney(rip.cost)}. Edit`}
            onPress={onEditCost}
          />
        }
      />
      {summary.perPack !== null ? (
        <FactRow label="Per pack" value={formatMoney(summary.perPack)} hint={`Average across ${rip.packs} packs`} />
      ) : null}
    </SectionPanel>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    hero: {
      gap: spacing.xs,
    },
    total: {
      ...typography.title,
      fontSize: 40,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    caption: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
    verdict: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radius.pill,
      borderWidth: StyleSheet.hairlineWidth,
    },
    verdictGain: {
      borderColor: theme.colors.gain,
    },
    verdictLoss: {
      borderColor: theme.colors.loss,
    },
    verdictText: {
      ...typography.label,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    loss: {
      color: theme.colors.loss,
    },
    cost: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
      textAlign: 'right',
    },
  });
}
