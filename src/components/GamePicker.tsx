import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/theme';
import type { Game } from '@/types/card';
import { GAMES } from '@/utils/game';

import { GameEmblem } from './GameEmblem';
import { PressableScale } from './PressableScale';

type Props = {
  value: Game;
  onChange: (game: Game) => void;
};

export function GamePicker({ value, onChange }: Props) {
  const theme = useTheme();
  const haptics = useHaptics();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
      {GAMES.map((entry) => {
        const selected = entry.game === value;
        return (
          <PressableScale
            key={entry.game}
            onPress={() => {
              haptics.selection();
              onChange(entry.game);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={entry.label}
            scaleTo={0.95}
            hitSlop={3}
          >
            <View
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.text : theme.colors.surfaceRaised,
                  borderColor: selected ? theme.colors.text : theme.colors.border,
                },
              ]}
            >
              <GameEmblem game={entry.game} size={20} />
              <Text style={[styles.label, { color: selected ? theme.colors.background : theme.colors.text }]} numberOfLines={1}>
                {entry.short}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: {
    ...typography.label,
    fontSize: 14,
    fontWeight: '600',
  },
});
