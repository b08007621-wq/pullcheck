import { ScrollView, StyleSheet } from 'react-native';

import { spacing } from '@/theme';
import type { Game } from '@/types/card';
import { GAMES } from '@/utils/game';

import { FilterChip } from './FilterChip';

type Props = {
  value: Game;
  onChange: (game: Game) => void;
};

export function GamePicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {GAMES.map((entry) => (
        <FilterChip
          key={entry.game}
          label={entry.short}
          selected={entry.game === value}
          onPress={() => onChange(entry.game)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});
