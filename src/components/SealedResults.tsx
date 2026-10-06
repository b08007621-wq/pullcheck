import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, Text } from 'react-native';

import { useCollection } from '@/hooks/useCollection';
import type { SealedSearch } from '@/hooks/useSealedSearch';
import { useTheme } from '@/hooks/useTheme';
import { sealedKey } from '@/state/collectionContext';
import { spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';

import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { MarketHomeView } from './MarketHomeView';
import { SealedListItem } from './SealedListItem';
import { SkeletonRows } from './SkeletonRows';
import { SuggestionChips } from './SuggestionChips';

type Props = {
  search: SealedSearch;
  bottomInset: number;
  onSuggestion: (text: string) => void;
  recent: string[];
  onClearRecent: () => void;
  onOpenResult: () => void;
};

const SUGGESTIONS = {
  sealed: ['Elite Trainer Box', 'Booster Bundle', 'Lumiose City Mini Tin', 'ex Box', 'Prismatic Evolutions', '151'],
  jpSealed: ['Booster Box', '151', 'Terastal Festival', 'Shiny Treasure', 'VSTAR Universe'],
  jpSingles: ['Pikachu', 'Charizard', 'Umbreon', 'Mew', 'Eevee'],
};

export function SealedResults({ search, bottomInset, onSuggestion, recent, onClearRecent, onOpenResult }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const { items } = useCollection();
  const singles = search.kind === 'singles';
  const japanese = search.market === 'jp';

  const owned = useMemo(() => {
    const quantities = new Map<string, number>();
    for (const item of items) quantities.set(item.key, item.quantity);
    return quantities;
  }, [items]);

  const openProduct = useCallback(
    (product: SealedProduct) => {
      onOpenResult();
      router.push({
        pathname: '/sealed/[id]',
        params: { id: String(product.productId), groupId: String(product.groupId), market: product.market ?? 'en' },
      });
    },
    [router, onOpenResult],
  );

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<SealedProduct>) => (
      <SealedListItem
        product={item}
        ownedQuantity={owned.get(sealedKey(item.productId)) ?? 0}
        onPress={openProduct}
      />
    ),
    [owned, openProduct],
  );

  if (search.status === 'idle') {
    return (
      <MarketHomeView market={search.market} kind={search.kind} bottomInset={bottomInset}>
        <SuggestionChips
          title="Recent"
          icon="time-outline"
          suggestions={recent}
          onSelect={onSuggestion}
          onClear={onClearRecent}
          align="start"
        />
        <SuggestionChips
          title="Try"
          icon="sparkles-outline"
          suggestions={singles ? SUGGESTIONS.jpSingles : japanese ? SUGGESTIONS.jpSealed : SUGGESTIONS.sealed}
          onSelect={onSuggestion}
          align="start"
        />
      </MarketHomeView>
    );
  }

  if (search.status === 'loading') {
    return <SkeletonRows imageShape="square" />;
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

  if (search.products.length === 0) {
    return (
      <EmptyState
        icon="help-circle-outline"
        title={singles ? 'No cards found' : 'No products found'}
        message={
          singles
            ? `Nothing matches “${search.query}” in recent Japanese sets. Add the set name, like “Pikachu 151”.`
            : `Nothing matches “${search.query}”. Try a set name like “Surging Sparks ETB”.`
        }
        bottomInset={bottomInset}
      />
    );
  }

  const noun = singles ? 'card' : 'product';

  return (
    <FlatList
      data={search.products}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={[styles.content, { paddingBottom: bottomInset + spacing.lg }]}
      scrollIndicatorInsets={{ bottom: bottomInset }}
      ListHeaderComponent={
        <Text style={[styles.count, { color: theme.colors.textMuted }]}>
          {search.products.length === 1 ? `1 ${noun}` : `${search.products.length} ${noun}s`}
        </Text>
      }
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      initialNumToRender={8}
      windowSize={9}
    />
  );
}

function keyExtractor(product: SealedProduct): string {
  return String(product.productId);
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  count: {
    ...typography.caption,
    paddingBottom: spacing.xs,
  },
});
