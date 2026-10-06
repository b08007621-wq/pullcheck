import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SetInfo } from '@/types/set';
import { formatDate, parseDate } from '@/utils/date';
import { formatMoney } from '@/utils/price';
import type { SetListProgress } from '@/utils/setProgress';

import { ListRow, type RowPosition } from './ListRow';
import { ProgressRing } from './ProgressRing';

type Props = {
  set: SetInfo;
  progress: SetListProgress | null;
  position: RowPosition;
  onPress: (set: SetInfo) => void;
};

function SetRowView({ set, progress, position, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const released = parseDate(set.releaseDate);
  const percent = progress ? Math.round(progress.percent * 100) : 0;
  const complete = progress !== null && progress.owned >= progress.total;

  return (
    <ListRow position={position} inset={112}>
      <Pressable
        onPress={() => onPress(set)}
        accessibilityRole="button"
        accessibilityLabel={
          progress ? `${set.name}, ${progress.owned} of ${progress.total} cards, ${percent} percent` : set.name
        }
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <View style={styles.logoBox}>
          {set.logo ? (
            <Image source={set.logo} style={styles.logo} contentFit="contain" recyclingKey={set.id} />
          ) : (
            <Text style={styles.logoText} numberOfLines={2}>
              {set.ptcgoCode ?? 'PROMO'}
            </Text>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {set.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {progress
              ? `${progress.owned} of ${progress.total}${progress.value > 0 ? ` · ${formatMoney(progress.value)}` : ''}`
              : `${released ? `${formatDate(released)} · ` : ''}${set.printedTotal} cards`}
          </Text>
        </View>
        {progress ? (
          <ProgressRing
            size={34}
            stroke={3}
            progress={progress.percent}
            color={complete ? theme.colors.gain : theme.colors.accent}
            track={theme.colors.surfaceRaised}
          >
            <Text style={[styles.percent, complete && styles.complete]}>{percent}</Text>
          </ProgressRing>
        ) : null}
      </Pressable>
    </ListRow>
  );
}

export const SetRow = memo(SetRowView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.lg,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    logoBox: {
      width: 88,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
    },
    logo: {
      width: '100%',
      height: '100%',
    },
    logoText: {
      ...typography.label,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.5,
      textAlign: 'center',
      color: theme.colors.textMuted,
    },
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.label,
      fontSize: 16,
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    percent: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    complete: {
      color: theme.colors.gain,
    },
  });
}
