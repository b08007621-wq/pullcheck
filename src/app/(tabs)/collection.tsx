import { useFocusEffect, useRouter } from 'expo-router';
import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  type ListRenderItemInfo,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppearanceButton } from '@/components/AppearanceButton';
import { CollectionCoverflow } from '@/components/CollectionCoverflow';
import { CollectionCustomizeSheet } from '@/components/CollectionCustomizeSheet';
import { CollectionFilterSheet } from '@/components/CollectionFilterSheet';
import { CollectionGridItem } from '@/components/CollectionGridItem';
import { CollectionListItem } from '@/components/CollectionListItem';
import { CollectionQuickStats } from '@/components/CollectionQuickStats';
import { CollectionShortcuts } from '@/components/CollectionShortcuts';
import { CollectionSummaryCard } from '@/components/CollectionSummaryCard';
import { CollectionToolbar } from '@/components/CollectionToolbar';
import { CollectionValueChart } from '@/components/CollectionValueChart';
import { EmptyState } from '@/components/EmptyState';
import { FreshPullPanel } from '@/components/FreshPullPanel';
import { IconButton } from '@/components/IconButton';
import { ItemActionsSheet } from '@/components/ItemActionsSheet';
import { rowPosition } from '@/components/ListRow';
import { MoneyEditor } from '@/components/MoneyEditor';
import { RecentlyAddedStrip } from '@/components/RecentlyAddedStrip';
import { Screen } from '@/components/Screen';
import { SkeletonRows } from '@/components/SkeletonRows';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { spacing, typography } from '@/theme';
import type { CollectionItem, CollectionLayout, CollectionSection, CollectionView } from '@/types/collection';
import { itemBinder } from '@/utils/binder';
import { type CollectionQuery, queryCollection, setCounts } from '@/utils/collectionQuery';
import { summarizeCollection } from '@/utils/collectionValue';
import { itemViewerParams } from '@/utils/viewer';

const INITIAL_QUERY: Omit<CollectionQuery, 'basis'> = {
  text: '',
  type: 'all',
  binder: 'all',
  quick: null,
  set: null,
  sort: 'value',
};

export default function CollectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const haptics = useHaptics();
  const { items, meta, isLoaded, refreshing, refreshFailed, refreshPrices, setPaid } = useCollection();
  const { refresh: refreshWishlist } = useWishlist();
  const { fresh, clearFresh } = useCelebrate();
  const { settings, updateSettings } = useSettings();
  const { width } = useWindowDimensions();
  const view = settings.collectionView;
  const layout = settings.collectionLayout;
  const [filters, setFilters] = useState(INITIAL_QUERY);
  const [pulling, setPulling] = useState(false);
  const [sheet, setSheet] = useState<'filters' | 'customize' | null>(null);
  const [actionItem, setActionItem] = useState<CollectionItem | null>(null);
  const [paidItem, setPaidItem] = useState<CollectionItem | null>(null);
  const query = useMemo(() => ({ ...filters, basis: layout.changeBasis }), [filters, layout.changeBasis]);

  const setView = useCallback((next: CollectionView) => updateSettings({ collectionView: next }), [updateSettings]);
  const setLayout = useCallback((next: CollectionLayout) => updateSettings({ collectionLayout: next }), [updateSettings]);
  const changeQuery = useCallback(
    (changes: Partial<CollectionQuery>) => setFilters((current) => ({ ...current, ...changes })),
    [],
  );

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
  const usesBinders = useMemo(() => items.some((item) => itemBinder(item) !== 'personal'), [items]);
  const sets = useMemo(() => setCounts(items), [items]);
  const visible = useMemo(() => queryCollection(items, query, usesBinders), [items, query, usesBinders]);
  const freshIds = useMemo(() => new Set(fresh?.cards.map((card) => card.id) ?? []), [fresh]);
  const isFresh = useCallback(
    (item: CollectionItem) => item.kind === 'card' && freshIds.has(item.card.id),
    [freshIds],
  );

  const openItem = useCallback(
    (item: CollectionItem) => {
      setActionItem(null);
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

  const showActions = useCallback(
    (item: CollectionItem) => {
      haptics.selection();
      setActionItem(item);
    },
    [haptics],
  );

  const columns = layout.gridColumns;
  const tileWidth = Math.floor((width - spacing.lg * 2 - spacing.sm * (columns - 1)) / columns);

  const renderGridItem = useCallback(
    ({ item }: ListRenderItemInfo<CollectionItem>) => (
      <CollectionGridItem
        item={item}
        width={tileWidth}
        basis={layout.changeBasis}
        details={layout.gridDetails}
        fresh={isFresh(item)}
        onPress={openItem}
        onLongPress={showActions}
      />
    ),
    [openItem, showActions, tileWidth, layout.changeBasis, layout.gridDetails, isFresh],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<CollectionItem>) => (
      <CollectionListItem
        item={item}
        position={rowPosition(index, visible.length)}
        basis={layout.changeBasis}
        fresh={isFresh(item)}
        onPress={openItem}
        onLongPress={showActions}
      />
    ),
    [openItem, showActions, visible.length, layout.changeBasis, isFresh],
  );

  const sheets = (
    <>
      {sheet === 'filters' ? (
        <CollectionFilterSheet query={query} sets={sets} onChange={changeQuery} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'customize' ? (
        <CollectionCustomizeSheet layout={layout} items={items} onChange={setLayout} onClose={() => setSheet(null)} />
      ) : null}
      {actionItem ? (
        <ItemActionsSheet
          item={actionItem}
          basis={layout.changeBasis}
          onOpen={openItem}
          onEditPaid={(item) => {
            setActionItem(null);
            setPaidItem(item);
          }}
          onClose={() => setActionItem(null)}
        />
      ) : null}
      {paidItem ? (
        <MoneyEditor
          initial={paidItem.paid ?? null}
          heading="What did you pay?"
          message="Per copy. It’s used for your profit and the Paid change view."
          onSave={(paid) => {
            haptics.tap();
            setPaid(paidItem.key, paid);
          }}
          onClose={() => setPaidItem(null)}
        />
      ) : null}
    </>
  );

  const headerAction = (
    <View style={styles.actions}>
      <IconButton
        icon="create-outline"
        accessibilityLabel="Customize this page"
        onPress={() => {
          haptics.tap();
          setSheet('customize');
        }}
      />
      <AppearanceButton />
    </View>
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
    const hidden = new Set(layout.hidden);
    const chart = <CollectionValueChart items={items} history={meta.valueHistory} onOpen={openItem} />;
    const sections: Record<CollectionSection, ReactNode> = {
      pulled: fresh ? (
        <FreshPullPanel
          pull={fresh}
          onOpenCard={(id) => router.push({ pathname: '/card/[id]', params: { id } })}
          onDismiss={() => {
            haptics.selection();
            clearFresh();
          }}
        />
      ) : null,
      summary: (
        <CollectionSummaryCard
          summary={summary}
          history={meta.valueHistory}
          lastRefreshAt={meta.lastRefreshAt}
          pricesAsOf={meta.pricesAsOf ?? null}
          refreshing={refreshing}
          refreshFailed={refreshFailed}
          chart={hidden.has('chart') ? undefined : chart}
        />
      ),
      chart: hidden.has('summary') ? chart : null,
      recent: <RecentlyAddedStrip items={items} onOpen={openItem} onLongPress={showActions} />,
      stats: (
        <CollectionQuickStats
          items={items}
          onFilter={(quick) => {
            haptics.selection();
            changeQuery({ quick });
          }}
          onOpen={openItem}
        />
      ),
      shortcuts: <CollectionShortcuts variant="row" />,
    };

    const emptyText = (
      <View style={styles.emptyFilter}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>Nothing matches.</Text>
        <Pressable onPress={() => setFilters(INITIAL_QUERY)} accessibilityRole="button" hitSlop={8}>
          <Text style={[styles.clear, { color: theme.colors.accent }]}>Clear search and filters</Text>
        </Pressable>
      </View>
    );

    const header = (
      <View style={styles.header}>
        {layout.order
          .filter((section) => !hidden.has(section) && sections[section])
          .map((section) => (
            <View key={section}>{sections[section]}</View>
          ))}
        <CollectionToolbar
          query={query}
          view={view}
          usesBinders={usesBinders}
          shown={visible.length}
          onChange={changeQuery}
          onView={setView}
          onFilters={() => setSheet('filters')}
        />
      </View>
    );

    const refresh = (
      <RefreshControl
        refreshing={pulling}
        onRefresh={pullToRefresh}
        tintColor={theme.colors.accent}
        colors={[theme.colors.accent]}
      />
    );

    if (view === 'cover') {
      content = (
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg }]}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh}
        >
          {header}
          <View style={styles.coverStage}>
            {visible.length > 0 ? (
              <CollectionCoverflow
                items={visible}
                bottomInset={0}
                basis={layout.changeBasis}
                isFresh={isFresh}
                onOpen3d={open3d}
                onLongPress={showActions}
              />
            ) : (
              emptyText
            )}
          </View>
        </ScrollView>
      );
    } else {
      content = (
        <FlatList
          key={view === 'grid' ? `grid-${columns}` : 'list'}
          data={visible}
          keyExtractor={keyExtractor}
          renderItem={view === 'grid' ? renderGridItem : renderItem}
          numColumns={view === 'grid' ? columns : 1}
          columnWrapperStyle={view === 'grid' ? styles.gridRow : undefined}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg }]}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refresh}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyText}
        />
      );
    }
  }

  return (
    <Screen title="Collection" action={headerAction}>
      {content}
      {sheets}
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
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  coverStage: {
    marginHorizontal: -spacing.lg,
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
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
  },
  clear: {
    ...typography.label,
    fontSize: 15,
  },
});
