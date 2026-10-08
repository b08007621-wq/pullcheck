import { StyleSheet, Text, View } from 'react-native';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo, SetMode } from '@/types/set';
import { formatMoney } from '@/utils/price';
import type { SetStats, SetValue } from '@/utils/setProgress';

import { GlassSurface } from './GlassSurface';
import { ProgressRing } from './ProgressRing';
import { SegmentedControl } from './SegmentedControl';
import { SetStat } from './SetStat';

type Props = {
  set: SetInfo;
  stats: SetStats;
  value: SetValue | null;
  mode: SetMode;
  onModeChange: (mode: SetMode) => void;
};

const MODES: { value: SetMode; label: string }[] = [
  { value: 'set', label: 'Set' },
  { value: 'master', label: 'Master set' },
];

export function SetProgressCard({ set, stats, value, mode, onModeChange }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const motion = useMotionEnabled();
  const shownPercent = useAnimatedNumber(stats.percent * 100, motion);
  const complete = stats.total > 0 && stats.owned >= stats.total;
  const unit = mode === 'master' ? 'versions' : 'cards';

  return (
    <GlassSurface style={styles.card}>
      <View style={styles.top}>
        <ProgressRing
          size={112}
          stroke={9}
          progress={shownPercent / 100}
          color={complete ? theme.colors.gain : theme.colors.accent}
          track={theme.colors.border}
        >
          <Text style={[styles.percent, complete && styles.gain]}>{Math.round(shownPercent)}%</Text>
          <Text style={styles.ratio}>
            {stats.owned}/{stats.total}
          </Text>
        </ProgressRing>
        <View style={styles.stats}>
          <SetStat
            label="You own"
            value={value && value.total > 0 ? formatMoney(value.total) : '—'}
            hint={
              value && value.sealed > 0
                ? `Cards ${formatMoney(value.cards)} · Sealed ${formatMoney(value.sealed)}`
                : undefined
            }
          />
          <SetStat
            label="To complete"
            value={complete ? 'Done!' : formatMoney(stats.missingCost)}
            hint={stats.missingUnpriced > 0 && !complete ? `+${stats.missingUnpriced} without a price` : undefined}
            tone={complete ? 'gain' : 'default'}
          />
          <SetStat label="Missing" value={complete ? '0' : `${stats.total - stats.owned} ${unit}`} />
        </View>
      </View>
      <SegmentedControl options={MODES} value={mode} onChange={onModeChange} />
      <Text style={styles.caption}>
        {mode === 'master'
          ? `All ${set.total} cards, including secret rares, in every version: normal, reverse holo and holo.`
          : `The ${set.printedTotal} numbered cards, 1 to ${set.printedTotal}. Any version counts.`}
      </Text>
    </GlassSurface>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.lg,
    },
    percent: {
      ...typography.heading,
      fontSize: 26,
      fontWeight: '800',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    ratio: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    stats: {
      flex: 1,
      gap: spacing.sm,
    },
    caption: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textFaint,
      textAlign: 'center',
    },
  });
}
