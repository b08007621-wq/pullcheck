import { useRouter } from 'expo-router';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from './DetailLayout';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { FilterChip } from './FilterChip';
import { GameSetRow } from './GameSetRow';
import { rowPosition } from './ListRow';
import { SearchBar } from './SearchBar';
import { SkeletonRows } from './SkeletonRows';
import { useCollection } from '@/hooks/useCollection';
import { useGameSets } from '@/hooks/useGameSets';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { GameSet } from '@/types/gameSet';
import { gameInfo, type OtherGame } from '@/utils/game';
import { gameSetProgress } from '@/utils/gameSetProgress';

const ALL = 'All';
const OWNED = 'Yours';

type Props = {
  game: OtherGame | null;
  leading?: ReactNode;
};

export function GameSetList({ game, leading }: Props) {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { sets, error, retry } = useGameSets(game);
  const { items } = useCollection();
  const [query, setQuery] = useState('');
  const [type, setType] = useState(ALL);

  const progress = useMemo(() => gameSetProgress(items, sets ?? []), [items, sets]);
  const types = useMemo(() => {
    const counts = new Map<string, number>();
    for (const set of sets ?? []) if (set.type) counts.set(set.type, (counts.get(set.type) ?? 0) + 1);
    return [...counts].sort((first, second) => second[1] - first[1]).map(([name]) => name);
  }, [sets]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (sets ?? []).filter((set) => {
      if (type === OWNED && !progress.has(set.id)) return false;
      if (type !== ALL && type !== OWNED && set.type !== type) return false;
      return !needle || set.name.toLowerCase().includes(needle) || set.code.toLowerCase().includes(needle);
    });
  }, [sets, query, type, progress]);

  const openSet = useCallback(
    (set: GameSet) => {
      haptics.tap();
      router.push({ pathname: '/tcgset/[id]', params: { id: set.id, name: set.name } });
    },
    [haptics, router],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<GameSet>) => (
      <GameSetRow
        set={item}
        progress={progress.get(item.id) ?? null}
        position={rowPosition(index, visible.length)}
        onPress={openSet}
      />
    ),
    [progress, visible.length, openSet],
  );

  if (!game) {
    return (
      <DetailLayout centered>
        <EmptyState icon="help-circle-outline" title="Unknown game" message="This game isn’t supported yet." />
      </DetailLayout>
    );
  }

  const info = gameInfo(game);
  const chips = [ALL, ...(progress.size > 0 ? [OWNED] : []), ...types];

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          data={sets ? visible : []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={14}
          ListHeaderComponent={
            <View style={styles.header}>
              {leading}
              <Text style={styles.title} accessibilityRole="header">
                {info.short} sets
              </Text>
              <Text style={styles.subtitle}>
                {sets ? `${sets.length} sets · newest first · from ${info.source}` : `Loading sets from ${info.source}…`}
              </Text>
              <SearchBar value={query} onChangeText={setQuery} placeholder="Find a set by name or code" />
              {chips.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {chips.map((chip) => (
                    <FilterChip key={chip} label={chip} selected={chip === type} onPress={() => setType(chip)} />
                  ))}
                </ScrollView>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            error && !sets ? (
              <ErrorState title="Couldn’t load sets" message={error.message} onRetry={retry} />
            ) : sets ? (
              <EmptyState icon="search" title="No sets match" message="Try another name, code or filter." />
            ) : (
              <SkeletonRows count={8} />
            )
          }
        />
      )}
    />
  );
}

function keyExtractor(set: GameSet): string {
  return set.id;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      flexGrow: 1,
    },
    header: {
      gap: spacing.md,
      paddingBottom: spacing.md,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: -spacing.sm,
    },
    chips: {
      gap: spacing.sm,
    },
  });
}
