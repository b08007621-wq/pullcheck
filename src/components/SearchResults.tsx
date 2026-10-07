import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, Text } from 'react-native';

import type { CardSearch } from '@/hooks/useCardSearch';
import { useCollection } from '@/hooks/useCollection';
import { useTheme } from '@/hooks/useTheme';
import { setBrowseList } from '@/services/cardBrowse';
import { spacing, typography } from '@/theme';
import type { Card, Game } from '@/types/card';
import { ownedCardCounts } from '@/utils/collectionValue';
import { gameInfo } from '@/utils/game';

import { CardListItem } from './CardListItem';
import { DiscoverHome } from './DiscoverHome';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { GameHome } from './GameHome';
import { rowPosition } from './ListRow';
import { LoadMoreFooter } from './LoadMoreFooter';
import { SkeletonRows } from './SkeletonRows';

type Props = {
  search: CardSearch;
  game?: Game;
  bottomInset: number;
  onSuggestion: (text: string) => void;
  recent: string[];
  onClearRecent: () => void;
  onOpenResult: () => void;
};

export function SearchResults({ search, game = 'pokemon', bottomInset, onSuggestion, recent, onClearRecent, onOpenResult }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { items } = useCollection();

  const owned = useMemo(() => ownedCardCounts(items), [items]);

  const openCard = useCallback(
    (card: Card) => {
      onOpenResult();
      setBrowseList(search.cards.map((stop) => ({ id: stop.id, card: stop })));
      router.push({ pathname: '/card/[id]', params: { id: card.id } });
    },
    [router, onOpenResult, search.cards],
  );

  const count = search.cards.length;
  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Card>) => (
      <CardListItem
        card={item}
        ownedQuantity={owned.get(item.id) ?? 0}
        position={rowPosition(index, count)}
        onPress={openCard}
      />
    ),
    [owned, openCard, count],
  );

  const info = gameInfo(game);

  if (search.status === 'idle' && game !== 'pokemon') {
    return (
      <GameHome game={game} bottomInset={bottomInset} recent={recent} onSuggestion={onSuggestion} onClearRecent={onClearRecent} />
    );
  }

  if (search.status === 'idle') {
    return (
      <DiscoverHome
        bottomInset={bottomInset}
        recent={recent}
        suggestions={info.suggestions}
        onSuggestion={onSuggestion}
        onClearRecent={onClearRecent}
      />
    );
  }

  if (search.status === 'loading') {
    return <SkeletonRows />;
  }

  if (search.status === 'error') {
    return (
      <ErrorState
        title="Search failed"
        message={search.error?.message ?? 'Something went wrong while searching.'}
        onRetry={search.retry}
        bottomInset={bottomInset}
      />
    );
  }

  if (search.cards.length === 0) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title="No cards found"
        message={`Nothing matches “${search.query}”. Check the spelling or try fewer words.`}
        bottomInset={bottomInset}
      />
    );
  }

  return (
    <FlatList
      data={search.cards}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.lg }]}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      ListHeaderComponent={
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {formatCount(search.totalCount)}
          {search.isStale ? ' · saved results, the card database is unreachable' : ''}
        </Text>
      }
      ListFooterComponent={
        <LoadMoreFooter
          isLoading={search.isLoadingMore}
          failed={search.loadMoreFailed}
          hasMore={search.hasMore}
          onRetry={search.retry}
        />
      }
      onEndReached={search.loadMore}
      onEndReachedThreshold={0.6}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      windowSize={9}
    />
  );
}

function keyExtractor(card: Card): string {
  return card.id;
}

function formatCount(total: number): string {
  return total === 1 ? '1 card' : `${total.toLocaleString('en-US')} cards`;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  count: {
    ...typography.caption,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
});
