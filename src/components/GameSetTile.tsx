import { memo } from 'react';
import { StyleSheet, Text } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { GameSet } from '@/types/gameSet';
import { formatShortDate, parseDate } from '@/utils/date';

import { GameSetIcon } from './GameSetIcon';
import { GlassSurface } from './GlassSurface';
import { PressableScale } from './PressableScale';

type Props = {
  set: GameSet;
  onPress: (set: GameSet) => void;
};

function GameSetTileView({ set, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const released = parseDate(set.releaseDate);

  return (
    <PressableScale onPress={() => onPress(set)} accessibilityRole="button" accessibilityLabel={set.name}>
      <GlassSurface style={styles.tile}>
        <GameSetIcon set={set} width={112} height={56} />
        <Text style={styles.name} numberOfLines={2}>
          {set.name}
        </Text>
        {released ? <Text style={styles.date}>{formatShortDate(released)}</Text> : null}
      </GlassSurface>
    </PressableScale>
  );
}

export const GameSetTile = memo(GameSetTileView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tile: {
      width: 136,
      padding: spacing.md,
      gap: spacing.xs,
      alignItems: 'center',
      borderRadius: radius.lg,
    },
    name: {
      ...typography.caption,
      fontWeight: '600',
      textAlign: 'center',
      color: theme.colors.text,
    },
    date: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
  });
}
