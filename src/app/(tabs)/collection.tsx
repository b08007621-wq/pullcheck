import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppearanceButton } from '@/components/AppearanceButton';
import { CollectionListItem } from '@/components/CollectionListItem';
import { CollectionShortcuts } from '@/components/CollectionShortcuts';
import { rowPosition } from '@/components/ListRow';
import { CollectionSummaryCard } from '@/components/CollectionSummaryCard';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonRows } from '@/components/SkeletonRows';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SortToggle } from '@/components/SortToggle';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { spacing, typography } from '@/theme';
import type { CollectionFilter, CollectionItem, CollectionSort } from '@/types/collection';
import { sortCollection, summarizeCollection } from '@/utils/collectionValue';

const FILTERS: { value: CollectionFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'card', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
];

export default function CollectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const haptics = useHaptics();
  const { items, meta, isLoaded, refreshing, refreshFailed, refreshPrices } = useCollection();
  const { refresh: refreshWishlist } = useWishlist();
  const [filter, setFilter] = useState<CollectionFilter>('all');
  const [sort, setSort] = useState<CollectionSort>('value');
  const [pulling, setPulling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isLoaded) refreshPrices(false);
      refreshWishlist(false);
    }, [isLoaded, refreshPrices, refreshWishlist]),
  );

  const pullToRefresh = useCallback(async () => {
    setPulling(true);
    haptics.tap();
    await refreshPrices(true);
    setPulling(false);
    haptics.selection();
  }, [haptics, refreshPrices]);

  const summary = useMemo(() => summarizeCollection(items), [items]);
  const visible = useMemo(
    () => sortCollection(filter === 'all' ? items : items.filter((item) => item.kind === filter), sort),
    [items, filter, sort],
  );

  const openItem = useCallback(
    (item: CollectionItem) => {
      if (item.kind === 'card') {
        router.push({ pathname: '/card/[id]', params: { id: item.card.id, entry: item.key } });
      } else {
        router.push({
          pathname: '/sealed/[id]',
          params: {
            id: String(item.product.productId),
            groupId: String(item.product.groupId),
            market: item.product.market ?? 'en',
          },
        });
      }
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CollectionItem>) => (
      <CollectionListItem item={item} position={rowPosition(index, visible.length)} onPress={openItem} />
    ),
    [openItem, visible.length],
  );

  let content;
  if (!isLoaded) {
    content = <SkeletonRows count={5} />;
  } else if (items.length === 0) {
    content = (
      <EmptyState
        icon="albums-outline"
        title="No cards yet"
        message="Cards and sealed products you add will show up here with their total value."
        bottomInset={tabBarHeight}
        action={{ label: 'Find a card', icon: 'search', onPress: () => router.navigate('/search') }}
      >
        <View style={styles.emptyShortcuts}>
          <CollectionShortcuts />
        </View>
      </EmptyState>
    );
  } else {
    content = (
      <FlatList
        data={visible}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg }]}
        scrollIndicatorInsets={{ bottom: tabBarHeight }}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={pullToRefresh}
            tintColor={theme.colors.accent}
            colors={[theme.colors.accent]}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <CollectionSummaryCard
              summary={summary}
              history={meta.valueHistory}
              lastRefreshAt={meta.lastRefreshAt}
              pricesAsOf={meta.pricesAsOf ?? null}
              refreshing={refreshing}
              refreshFailed={refreshFailed}
            />
            <CollectionShortcuts />
            <View style={styles.toolbar}>
              <View style={styles.filters}>
                <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
              </View>
              <SortToggle value={sort} onChange={setSort} />
            </View>
          </View>
        }
        ListEmptyComponent={
          <Text style={[styles.emptyFilter, { color: theme.colors.textMuted }]}>
            {filter === 'sealed' ? 'No sealed products yet.' : 'No cards yet.'}
          </Text>
        }
      />
    );
  }

  return (
    <Screen title="Collection" action={<AppearanceButton />}>
      {content}
    </Screen>
  );
}

function keyExtractor(item: CollectionItem): string {
  return item.key;
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  filters: {
    flex: 1,
  },
  emptyShortcuts: {
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  emptyFilter: {
    ...typography.body,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
