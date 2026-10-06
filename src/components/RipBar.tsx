import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';

import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';
import { useMotionEnabled } from '@/hooks/useMotionEnabled';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { Rip } from '@/types/rip';
import { formatMoney } from '@/utils/price';
import { summarizeRip } from '@/utils/rip';

import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  rip: Rip;
  bottom: number;
  onOpen: () => void;
};

export const RIP_BAR_HEIGHT = 72;

export function RipBar({ rip, bottom, onOpen }: Props) {
  const styles = useThemedStyles(createStyles);
  const summary = summarizeRip(rip);
  const shown = useAnimatedNumber(summary.totalUsd, useMotionEnabled());
  const paidOff = summary.totalUsd >= rip.cost;
  const progress = rip.cost > 0 ? Math.min(1, summary.totalUsd / rip.cost) : 1;
  const count = summary.count === 1 ? '1 card' : `${summary.count} cards`;

  return (
    <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
      <PressableScale
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${rip.title}, ${count}, ${formatMoney(summary.totalUsd)} of ${formatMoney(rip.cost)}. Open summary`}
        scaleTo={0.97}
      >
        <GlassSurface interactive style={styles.bar}>
          <View style={styles.row}>
            <Ionicons name="gift" size={20} color={styles.icon.color} />
            <View style={styles.text}>
              <Text style={styles.title} numberOfLines={1}>
                {rip.title}
              </Text>
              <Text style={styles.count}>{count}</Text>
            </View>
            <View style={styles.values}>
              <Text style={[styles.total, paidOff && styles.gain]}>{formatMoney(shown)}</Text>
              <Text style={styles.cost}>of {formatMoney(rip.cost)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={styles.count.color} />
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, paidOff && styles.fillGain, { width: `${progress * 100}%` }]} />
          </View>
        </GlassSurface>
      </PressableScale>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
    },
    bar: {
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm + 2,
      paddingBottom: spacing.sm,
      gap: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    icon: {
      color: theme.colors.accent,
    },
    text: {
      flex: 1,
    },
    title: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.text,
    },
    count: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    values: {
      alignItems: 'flex-end',
    },
    total: {
      ...typography.label,
      fontSize: 17,
      fontWeight: '800',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    gain: {
      color: theme.colors.gain,
    },
    cost: {
      ...typography.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    track: {
      height: 4,
      borderRadius: 2,
      overflow: 'hidden',
      backgroundColor: theme.colors.border,
    },
    fill: {
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.accent,
    },
    fillGain: {
      backgroundColor: theme.colors.gain,
    },
  });
}
