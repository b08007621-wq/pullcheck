import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { FilterChip } from '@/components/FilterChip';
import { GameCardTile } from '@/components/GameCardTile';
import { GameSetIcon } from '@/components/GameSetIcon';
import { LoadingState } from '@/components/LoadingState';
import { SetSealed } from '@/components/SetSealed';
import { SearchBar } from '@/components/SearchBar';
import { useCollection } from '@/hooks/useCollection';
import { useGameSetCards } from '@/hooks/useGameSetCards';
import { useGameSets } from '@/hooks/useGameSets';
import { useHaptics } from '@/hooks/useHaptics';
import { useSetSealed } from '@/hooks/useSetSealed';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { setBrowseList } from '@/services/cardBrowse';
import { type AppTheme, spacing, typography } from '@/theme';
import type { Card } from '@/types/card';
import { ownedCardCounts } from '@/utils/collectionValue';
import { formatDate, parseDate } from '@/utils/date';
import { gameInfo, gameOfId } from '@/utils/game';
import { formatMoney, getMarketPrice } from '@/utils/price';
import { setSealedValue } from '@/utils/setSealedValue';

type Show = 'all' | 'owned' | 'missing';
type Sort = 'number' | 'price';

const SHOWS: { value: Show; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'owned', label: 'Owned' },
  { value: 'missing', label: 'Missing' },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: 'number', label: 'By number' },
  { value: 'price', label: 'By price' },
];

const COLUMNS = 3;

export default function GameSetScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { id = '', name } = useLocalSearchParams<{ id: string; name?: string }>();
  const game = gameOfId(id);
  const { cards, error, retry } = useGameSetCards(id);
  const { sets } = useGameSets(game === 'pokemon' ? null : game);
  const { items } = useCollection();
  const [show, setShow] = useState<Show>('all');
  const [sort, setSort] = useState<Sort>('number');
  const [query, setQuery] = useState('');

  const owned = useMemo(() => ownedCardCounts(items), [items]);
  const set = sets?.find((entry) => entry.id === id) ?? null;
  const first = cards?.[0];
  const title = set?.name ?? first?.set.name ?? name ?? 'Set';
  const released = parseDate(set?.releaseDate ?? first?.set.releaseDate);
  const sealed = useSetSealed(cards ? { game, name: title, code: set?.code ?? null } : null);

  const stats = useMemo(() => {
    const list = cards ?? [];
    const ownedCards = list.filter((card) => (owned.get(card.id) ?? 0) > 0);
    const value = ownedCards.reduce((sum, card) => {
      const price = getMarketPrice(card);
      return sum + (price?.currency === 'USD' ? price.amount * (owned.get(card.id) ?? 0) : 0);
    }, 0);
    const setValue = list.reduce((sum, card) => {
      const price = getMarketPrice(card);
      return sum + (price?.currency === 'USD' ? price.amount : 0);
    }, 0);
    return { total: list.length, owned: ownedCards.length, value, setValue };
  }, [cards, owned]);

  const ownedSealed = useMemo(
    () => setSealedValue(items, { game, name: title, code: set?.code ?? null }),
    [items, game, title, set?.code],
  );
  const yourValue = stats.value + ownedSealed.value;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (cards ?? []).filter((card) => {
      const has = (owned.get(card.id) ?? 0) > 0;
      if (show === 'owned' && !has) return false;
      if (show === 'missing' && has) return false;
      return !needle || card.name.toLowerCase().includes(needle) || card.number.toLowerCase().includes(needle);
    });
    if (sort === 'price') {
      return [...filtered].sort((left, right) => (getMarketPrice(right)?.amount ?? 0) - (getMarketPrice(left)?.amount ?? 0));
    }
    return filtered;
  }, [cards, owned, show, sort, query]);

  const tileWidth = (width - spacing.lg * 2 - spacing.md * (COLUMNS - 1)) / COLUMNS;

  const openCard = useCallback(
    (card: Card) => {
      haptics.tap();
      setBrowseList(visible.map((stop) => ({ id: stop.id, card: stop })));
      router.push({ pathname: '/card/[id]', params: { id: card.id } });
    },
    [haptics, router, visible],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<Card>) => (
      <GameCardTile card={item} owned={owned.get(item.id) ?? 0} width={tileWidth} dimMissing={show !== 'missing'} onPress={openCard} />
    ),
    [owned, tileWidth, show, openCard],
  );

  if (!cards) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load this set" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message={`Loading ${title}…`} />
        )}
      </DetailLayout>
    );
  }

  const summary = [
    released ? formatDate(released) : null,
    `${stats.owned} of ${stats.total} owned`,
    yourValue > 0 ? `${formatMoney(yourValue)} yours${ownedSealed.value > 0 ? ' incl. sealed' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          data={visible}
          key={COLUMNS}
          numColumns={COLUMNS}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          columnWrapperStyle={styles.columns}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={7}
          ListHeaderComponent={
            <View style={styles.header}>
              {set ? <GameSetIcon set={set} width={120} height={64} /> : null}
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <Text style={styles.subtitle}>{summary}</Text>
              <View style={styles.statRow}>
                <Stat label="Owned" value={stats.total > 0 ? `${Math.round((stats.owned / stats.total) * 100)}%` : '—'} styles={styles} />
                <Stat label="Your value" value={formatMoney(yourValue)} styles={styles} />
                <Stat label="Whole set" value={stats.setValue > 0 ? formatMoney(stats.setValue) : '—'} styles={styles} />
              </View>
              <Text style={styles.source}>
                {gameInfo(game).short}
                {set?.code ? ` · ${set.code.toUpperCase()}` : ''}
              </Text>
              {sealed.products && sealed.products.length > 0 ? (
                <View style={styles.sealed}>
                  <SetSealed products={sealed.products} />
                </View>
              ) : null}
              <SearchBar value={query} onChangeText={setQuery} placeholder="Find a card in this set" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {SHOWS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={show === option.value}
                    onPress={() => setShow(option.value)}
                  />
                ))}
                {SORTS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    selected={sort === option.value}
                    onPress={() => setSort(option.value)}
                  />
                ))}
              </ScrollView>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon={show === 'missing' ? 'trophy-outline' : 'albums-outline'}
              title={show === 'missing' ? 'Set complete' : 'Nothing here yet'}
              message={show === 'missing' ? 'You own every card in this set.' : 'No cards match this filter.'}
            />
          }
        />
      )}
    />
  );
}

type StatProps = {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
};

function Stat({ label, value, styles }: StatProps) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function keyExtractor(card: Card): string {
  return card.id;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
      flexGrow: 1,
    },
    columns: {
      gap: spacing.md,
    },
    header: {
      alignItems: 'center',
      gap: spacing.md,
      paddingBottom: spacing.sm,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
      textAlign: 'center',
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginTop: -spacing.sm,
    },
    statRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      alignSelf: 'stretch',
    },
    stat: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderRadius: 14,
      backgroundColor: theme.colors.surfaceRaised,
    },
    statValue: {
      ...typography.label,
      color: theme.colors.text,
      fontWeight: '700',
    },
    statLabel: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textMuted,
    },
    source: {
      ...typography.caption,
      fontSize: 11,
      color: theme.colors.textFaint,
    },
    chips: {
      gap: spacing.sm,
    },
    sealed: {
      alignSelf: 'stretch',
    },
  });
}
