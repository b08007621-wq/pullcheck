import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SetCardTile } from '@/components/SetCardTile';
import { SetHero } from '@/components/SetHero';
import { SetProgressCard } from '@/components/SetProgressCard';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSetCards } from '@/hooks/useSetCards';
import { useSets } from '@/hooks/useSets';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useWishlist } from '@/hooks/useWishlist';
import { setBrowseList } from '@/services/cardBrowse';
import { type AppTheme, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import type { SetFilter, SetInfo, SetMode } from '@/types/set';
import {
  buildOwnedIndex,
  buildSetEntries,
  filterEntries,
  type SetEntry,
  setValueUsd,
  summarizeSet,
} from '@/utils/setProgress';

const COLUMNS = 3;
const GAP = spacing.sm + 2;

export default function SetScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { items } = useCollection();
  const { isWished } = useWishlist();
  const { sets, error: setsError, retry: retrySets } = useSets();
  const { cards, stale, error, retry } = useSetCards(id);
  const [mode, setMode] = useState<SetMode>('set');
  const [filter, setFilter] = useState<SetFilter>('all');

  const set = useMemo(
    () => sets?.find((entry) => entry.id === id) ?? (cards?.[0] ? setFromCard(cards[0]) : null),
    [sets, cards, id],
  );
  const index = useMemo(() => buildOwnedIndex(items), [items]);
  const entries = useMemo(() => (set && cards ? buildSetEntries(cards, set, mode, index) : []), [set, cards, mode, index]);
  const stats = useMemo(() => summarizeSet(entries), [entries]);
  const visible = useMemo(() => filterEntries(entries, filter), [entries, filter]);
  const value = useMemo(() => setValueUsd(items, id), [items, id]);
  const tileWidth = Math.floor((Math.min(width, 640) - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);

  const openCard = useCallback(
    (entry: SetEntry) => {
      haptics.tap();
      setBrowseList(visible.map((stop) => ({ id: stop.card.id })));
      router.push({ pathname: '/card/[id]', params: { id: entry.card.id } });
    },
    [haptics, router, visible],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SetEntry>) => (
      <SetCardTile entry={item} mode={mode} width={tileWidth} wished={isWished(item.card.id)} onPress={openCard} />
    ),
    [mode, tileWidth, isWished, openCard],
  );

  if (!set) {
    return (
      <DetailLayout centered>
        {error && setsError ? (
          <ErrorState
            title="Couldn’t load this set"
            message={error.message}
            onRetry={() => {
              retry();
              retrySets();
            }}
          />
        ) : (
          <LoadingState message="Loading set…" />
        )}
      </DetailLayout>
    );
  }

  const owned = entries.filter((entry) => entry.started).length;
  const missing = entries.filter((entry) => !entry.complete).length;
  const filters: { value: SetFilter; label: string }[] = [
    { value: 'all', label: `All ${entries.length}` },
    { value: 'owned', label: `Owned ${owned}` },
    { value: 'missing', label: `Missing ${missing}` },
  ];

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          ItemSeparatorComponent={RowGap}
          initialNumToRender={15}
          windowSize={7}
          ListHeaderComponent={
            <View style={styles.header}>
              <SetHero set={set} />
              {cards ? (
                <>
                  <SetProgressCard
                    set={set}
                    stats={stats}
                    value={value}
                    mode={mode}
                    onModeChange={(next) => {
                      setMode(next);
                      setFilter('all');
                    }}
                  />
                  <SegmentedControl options={filters} value={filter} onChange={setFilter} />
                  {stale ? <Text style={styles.note}>Showing saved prices. The card database isn’t answering right now.</Text> : null}
                </>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            cards ? (
              <Text style={styles.empty}>
                {filter === 'owned'
                  ? 'You don’t own any cards from this set yet.'
                  : filter === 'missing'
                    ? 'Nothing missing. You completed it!'
                    : 'This set has no cards listed yet.'}
              </Text>
            ) : error ? (
              <ErrorState title="Couldn’t load the cards" message={error.message} onRetry={retry} />
            ) : (
              <LoadingState message="Loading cards…" />
            )
          }
        />
      )}
    />
  );
}

function setFromCard(card: Card): SetInfo {
  const { set } = card;
  return {
    id: set.id,
    name: set.name,
    series: set.series,
    releaseDate: set.releaseDate,
    total: set.total,
    printedTotal: set.printedTotal && set.printedTotal > 0 ? set.printedTotal : set.total,
    ptcgoCode: set.ptcgoCode ?? null,
    logo: set.images.logo,
    symbol: set.images.symbol,
  };
}

function keyExtractor(entry: SetEntry): string {
  return entry.card.id;
}

function RowGap() {
  return <View style={rowGap} />;
}

const rowGap = { height: spacing.md };

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
    },
    columns: {
      gap: GAP,
    },
    header: {
      gap: spacing.lg,
      marginBottom: spacing.lg,
    },
    note: {
      ...typography.caption,
      color: theme.colors.textFaint,
      textAlign: 'center',
    },
    empty: {
      ...typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
  });
}
