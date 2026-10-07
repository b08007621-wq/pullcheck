import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { IconName } from '@/types/icon';
import type { CollectionItem } from '@/types/collection';
import { type CollectionQuery, gameTotals, QUICK_FILTERS, SORT_OPTIONS } from '@/utils/collectionQuery';
import { gameInfo } from '@/utils/game';

import { FilterChip } from './FilterChip';
import { SheetModal } from './SheetModal';

type Props = {
  query: CollectionQuery;
  sets: { name: string; count: number }[];
  items: CollectionItem[];
  onChange: (changes: Partial<CollectionQuery>) => void;
  onClose: () => void;
};

const SET_LIMIT = 40;

export function CollectionFilterSheet({ query, sets, items, onChange, onClose }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const active = query.quick !== null || query.set !== null || query.game !== 'all' || query.sort !== 'value';
  const games = gameTotals(items);

  return (
    <SheetModal onClose={onClose}>
      <View style={styles.top}>
        <Text style={styles.heading}>Sort & filter</Text>
        {active ? (
          <Pressable
            onPress={() => {
              haptics.selection();
              onChange({ quick: null, set: null, game: 'all', sort: 'value' });
            }}
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.reset}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Sort by</Text>
        <View style={styles.sortList}>
          {SORT_OPTIONS.map((option) => {
            const selected = option.value === query.sort;
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  haptics.selection();
                  onChange({ sort: option.value });
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [styles.sortRow, (pressed || selected) && styles.sortRowActive]}
              >
                <Ionicons name={option.icon as IconName} size={18} color={styles.icon.color} />
                <Text style={styles.sortLabel}>{option.label}</Text>
                {selected ? <Ionicons name="checkmark" size={18} color={styles.check.color} /> : null}
              </Pressable>
            );
          })}
        </View>

        {games.length > 1 ? (
          <>
            <Text style={styles.label}>Game</Text>
            <View style={styles.chips}>
              <FilterChip label="All games" selected={query.game === 'all'} onPress={() => onChange({ game: 'all' })} />
              {games.map((total) => (
                <FilterChip
                  key={total.game}
                  label={gameInfo(total.game).short}
                  count={total.count}
                  selected={query.game === total.game}
                  onPress={() => onChange({ game: query.game === total.game ? 'all' : total.game })}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>Show only</Text>
        <View style={styles.chips}>
          {QUICK_FILTERS.map((filter) => (
            <FilterChip
              key={filter.value}
              label={filter.label}
              selected={query.quick === filter.value}
              onPress={() => onChange({ quick: query.quick === filter.value ? null : filter.value })}
            />
          ))}
        </View>

        {sets.length > 1 ? (
          <>
            <Text style={styles.label}>Set</Text>
            <View style={styles.chips}>
              <FilterChip label="All sets" selected={query.set === null} onPress={() => onChange({ set: null })} />
              {sets.slice(0, SET_LIMIT).map((set) => (
                <FilterChip
                  key={set.name}
                  label={set.name}
                  count={set.count}
                  selected={query.set === set.name}
                  onPress={() => onChange({ set: query.set === set.name ? null : set.name })}
                />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
      <Pressable onPress={onClose} accessibilityRole="button" style={styles.done}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </SheetModal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    top: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    heading: {
      ...typography.heading,
      color: theme.colors.text,
    },
    reset: {
      ...typography.label,
      fontSize: 15,
      color: theme.colors.accent,
    },
    scroll: {
      flexGrow: 0,
    },
    body: {
      gap: spacing.sm,
      paddingBottom: spacing.sm,
    },
    label: {
      ...typography.caption,
      fontWeight: '600',
      color: theme.colors.textMuted,
      paddingTop: spacing.sm,
    },
    sortList: {
      gap: 2,
    },
    sortRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 11,
      borderRadius: radius.md,
    },
    sortRowActive: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    sortLabel: {
      ...typography.body,
      flex: 1,
      color: theme.colors.text,
    },
    icon: {
      color: theme.colors.textMuted,
    },
    check: {
      color: theme.colors.accent,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    done: {
      alignItems: 'center',
      justifyContent: 'center',
      height: 48,
      borderRadius: radius.pill,
      backgroundColor: theme.colors.accent,
    },
    doneText: {
      ...typography.label,
      color: theme.colors.onAccent,
    },
  });
}
