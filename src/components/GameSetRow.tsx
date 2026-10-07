import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { GameSet } from '@/types/gameSet';
import { formatDate, parseDate } from '@/utils/date';
import type { GameSetProgress } from '@/utils/gameSetProgress';
import { formatMoney } from '@/utils/price';

import { GameSetIcon } from './GameSetIcon';
import { ListRow, type RowPosition } from './ListRow';
import { ProgressRing } from './ProgressRing';

type Props = {
  set: GameSet;
  progress: GameSetProgress | null;
  position: RowPosition;
  onPress: (set: GameSet) => void;
};

function GameSetRowView({ set, progress, position, onPress }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const released = parseDate(set.releaseDate);
  const owned = progress?.owned ?? 0;
  const percent = set.total > 0 ? Math.min(1, owned / set.total) : 0;
  const details = [
    released ? formatDate(released) : null,
    set.total > 0 ? `${set.total} cards` : null,
    set.type,
  ]
    .filter(Boolean)
    .join(' · ');
  const ownedLine =
    owned > 0
      ? `${set.total > 0 ? `${owned} of ${set.total}` : `${owned} owned`}${progress && progress.value > 0 ? ` · ${formatMoney(progress.value)}` : ''}`
      : null;

  return (
    <ListRow position={position} inset={92}>
      <Pressable
        onPress={() => onPress(set)}
        accessibilityRole="button"
        accessibilityLabel={`${set.name}${ownedLine ? `, ${ownedLine}` : ''}`}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        <GameSetIcon set={set} width={64} height={44} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {set.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {ownedLine ?? details}
          </Text>
        </View>
        {owned > 0 && set.total > 0 ? (
          <ProgressRing size={34} stroke={3} progress={percent} color={theme.colors.accent} track={theme.colors.surfaceRaised}>
            <Text style={styles.percent}>{Math.round(percent * 100)}</Text>
          </ProgressRing>
        ) : null}
      </Pressable>
    </ListRow>
  );
}

export const GameSetRow = memo(GameSetRowView);

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
    info: {
      flex: 1,
      gap: 2,
    },
    name: {
      ...typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    percent: {
      ...typography.caption,
      fontSize: 10,
      fontWeight: '700',
      color: theme.colors.text,
    },
  });
}
