import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { AppearanceButton } from '@/components/AppearanceButton';
import { CollectionCoverflow } from '@/components/CollectionCoverflow';
import { CollectionGridItem } from '@/components/CollectionGridItem';
import { CollectionListItem } from '@/components/CollectionListItem';
import { CollectionShortcuts } from '@/components/CollectionShortcuts';
import { rowPosition } from '@/components/ListRow';
import { CollectionSummaryCard } from '@/components/CollectionSummaryCard';
import { CollectionValueChart } from '@/components/CollectionValueChart';
import { EmptyState } from '@/components/EmptyState';
import { SkeletonRows } from '@/components/SkeletonRows';
import { Screen } from '@/components/Screen';
import { SegmentedControl } from '@/components/SegmentedControl';
import { SortToggle } from '@/components/SortToggle';
import { ViewToggle } from '@/components/ViewToggle';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { spacing, typography } from '@/theme';
import type { BinderFilter, CollectionFilter, CollectionItem, CollectionSort, CollectionView } from '@/types/collection';
import { BINDER_FILTERS, itemBinder } from '@/utils/binder';
import { sortCollection, summarizeCollection } from '@/utils/collectionValue';
import { itemViewerParams } from '@/utils/viewer';

const GRID_COLUMNS = 3;

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
  const [binder, setBinder] = useState<BinderFilter>('all');
  const [view, setView] = useState<CollectionView>('list');
  const { width } = useWindowDimensions();
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
    () =>
      sortCollection(
        items.filter(
          (item) => (filter === 'all' || item.kind === filter) && (binder === 'all' || itemBinder(item) === binder),
        ),
        sort,
      ),
    [items, filter, binder, sort],
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

  const open3d = useCallback(
    (item: CollectionItem) => {
      const params = itemViewerParams(item);
      if (params) router.push({ pathname: '/viewer', params });
      else openItem(item);
    },
    [openItem, router],
  );

  const tileWidth = Math.floor((width - spacing.lg * 2 - spacing.sm * (GRID_COLUMNS - 1)) / GRID_COLUMNS);

  const renderGridItem = useCallback(
    ({ item }: ListRenderItemInfo<CollectionItem>) => <CollectionGridItem item={item} width={tileWidth} onPress={openItem} />,
    [openItem, tileWidth],
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
    const toolbar = (
      <View style={styles.header}>
        <View style={styles.toolbar}>
          <View style={styles.filters}>
            <SegmentedControl options={FILTERS} value={filter} onChange={setFilter} />
          </View>
          <ViewToggle value={view} onChange={setView} />
        </View>
        <View style={styles.toolbar}>
          <View style={styles.filters}>
            <SegmentedControl options={BINDER_FILTERS} value={binder} onChange={setBinder} />
          </View>
          <SortToggle value={sort} onChange={setSort} />
        </View>
      </View>
    );
    const emptyText = (
      <Text style={[styles.emptyFilter, { color: theme.colors.textMuted }]}>
        {filter === 'sealed' ? 'No sealed products here.' : 'Nothing here yet.'}
      </Text>
    );

    if (view === 'cover') {
      content = (
        <View style={styles.cover}>
          <View style={styles.coverToolbar}>{toolbar}</View>
          {visible.length > 0 ? (
            <CollectionCoverflow items={visible} bottomInset={tabBarHeight} onOpen3d={open3d} />
          ) : (
            emptyText
          )}
        </View>
      );
    } else {
      const header = (
        <View style={styles.header}>
          <CollectionSummaryCard
            summary={summary}
            history={meta.valueHistory}
            lastRefreshAt={meta.lastRefreshAt}
            pricesAsOf={meta.pricesAsOf ?? null}
            refreshing={refreshing}
            refreshFailed={refreshFailed}
            chart={<CollectionValueChart items={items} history={meta.valueHistory} onOpen={openItem} />}
          />
          <CollectionShortcuts variant="row" />
          {toolbar}
        </View>
      );
      content = (
        <FlatList
          key={view}
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={view === 'grid' ? renderGridItem : renderItem}
          numColumns={view === 'grid' ? GRID_COLUMNS : 1}
          columnWrapperStyle={view === 'grid' ? styles.gridRow : undefined}
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
          ListHeaderComponent={header}
          ListEmptyComponent={emptyText}
        />
      );
    }
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
  cover: {
    flex: 1,
  },
  coverToolbar: {
    paddingHorizontal: spacing.lg,
  },
  gridRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
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
