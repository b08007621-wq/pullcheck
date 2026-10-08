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

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppearanceButton } from '@/components/AppearanceButton';
import { BoardControls } from '@/components/BoardEditBar';
import { CollectionCoverflow } from '@/components/CollectionCoverflow';
import { CollectionCustomizeSheet } from '@/components/CollectionCustomizeSheet';
import { CollectionGamesPanel } from '@/components/CollectionGamesPanel';
import { CollectionTopCards } from '@/components/CollectionTopCards';
import { CollectionFilterSheet } from '@/components/CollectionFilterSheet';
import { CollectionGridItem } from '@/components/CollectionGridItem';
import { CollectionListItem } from '@/components/CollectionListItem';
import { CollectionQuickStats } from '@/components/CollectionQuickStats';
import { CollectionShortcuts } from '@/components/CollectionShortcuts';
import { CollectionSummaryCard } from '@/components/CollectionSummaryCard';
import { CollectionToolbar } from '@/components/CollectionToolbar';
import { CollectionValueChart } from '@/components/CollectionValueChart';
import { EmptyState } from '@/components/EmptyState';
import { ArrangeBoard, type BoardWidget } from '@/components/ArrangeBoard';
import { FreshPullPanel } from '@/components/FreshPullPanel';
import { IconButton } from '@/components/IconButton';
import { ItemActionsSheet } from '@/components/ItemActionsSheet';
import { rowPosition } from '@/components/ListRow';
import { MoneyEditor } from '@/components/MoneyEditor';
import { RecentlyAddedStrip } from '@/components/RecentlyAddedStrip';
import { Screen } from '@/components/Screen';
import { SkeletonRows } from '@/components/SkeletonRows';
import { useAutoScroll } from '@/hooks/useAutoScroll';
import { useBoard } from '@/hooks/useBoard';
import { useCelebrate } from '@/hooks/useCelebrate';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useSettings } from '@/hooks/useSettings';
import { useTheme } from '@/hooks/useTheme';
import { useWishlist } from '@/hooks/useWishlist';
import { setBrowseList } from '@/services/cardBrowse';
import { queueSeen, takeSeen } from '@/services/seen';
import { spacing, typography } from '@/theme';
import type { CollectionItem, CollectionLayout, CollectionSection, CollectionView } from '@/types/collection';
import { itemBinder } from '@/utils/binder';
import { SECTION_LABEL } from '@/utils/collectionSections';
import { type CollectionQuery, queryCollection, setCounts } from '@/utils/collectionQuery';
import { summarizeCollection } from '@/utils/collectionValue';
import { itemViewerParams } from '@/utils/viewer';

const EDIT_BAR_SPACE = 150;

const INITIAL_QUERY: Omit<CollectionQuery, 'basis'> = {
  text: '',
  type: 'all',
  binder: 'all',
  quick: null,
  set: null,
  game: 'all',
  sort: 'value',
};

export default function CollectionScreen() {
  const theme = useTheme();
  const router = useRouter();
  const tabBarHeight = useBottomTabBarHeight();
  const haptics = useHaptics();
  const { items, meta, isLoaded, refreshing, refreshFailed, refreshPrices, setPaid, markSeen } = useCollection();
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
  const boardFallback = useMemo(() => ({ items: {}, hidden: layout.hidden }), [layout.hidden]);
  const board = useBoard('collection', boardFallback);
  const listScroll = useAutoScroll();
  const coverScroll = useAutoScroll();
  const insets = useSafeAreaInsets();

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

  useFocusEffect(
    useCallback(() => {
      if (!isLoaded) return;
      const keys = takeSeen();
      if (keys.length === 0) return;
      let done = false;
      const timer = setTimeout(() => {
        done = true;
        markSeen(keys);
      }, 450);
      return () => {
        clearTimeout(timer);
        if (!done) queueSeen(keys);
      };
    }, [isLoaded, markSeen]),
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
      queueSeen([item.key]);
      if (item.kind === 'card') {
        setBrowseList(
          visible.flatMap((entry) => (entry.kind === 'card' ? [{ id: entry.card.id, entry: entry.key, card: entry.card }] : [])),
        );
        router.push({ pathname: '/card/[id]', params: { id: item.card.id, entry: item.key } });
      } else {
        router.push({
          pathname: '/sealed/[id]',
          params: {
            id: String(item.product.productId),
            groupId: String(item.product.groupId),
            market: item.product.market ?? 'en',
            ...(item.product.game ? { game: item.product.game } : {}),
          },
        });
      }
    },
    [router, visible],
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
        <CollectionFilterSheet query={query} sets={sets} items={items} onChange={changeQuery} onClose={() => setSheet(null)} />
      ) : null}
      {sheet === 'customize' ? (
        <CollectionCustomizeSheet
          layout={layout}
          items={items}
          hidden={board.layout.hidden}
          onToggleSection={board.toggle}
          onArrange={() => {
            setSheet(null);
            haptics.collect();
            board.setEditing(true);
          }}
          onChange={setLayout}
          onBackup={() => {
            setSheet(null);
            router.push('/backup');
          }}
          onClose={() => setSheet(null)}
        />
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
          onGradeCheck={(item) => {
            setActionItem(null);
            if (item.kind !== 'card') return;
            router.push({
              pathname: '/centering',
              params: item.variant ? { id: item.card.id, variant: item.variant } : { id: item.card.id },
            });
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
  let widgets: BoardWidget[] = [];
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
          <Pressable onPress={() => router.push('/backup')} accessibilityRole="button" hitSlop={8} style={styles.restore}>
            <Text style={[styles.clear, { color: theme.colors.accent }]}>Restore a backup or import from another app</Text>
          </Pressable>
        </View>
      </EmptyState>
    );
  } else {
    const hidden = new Set(board.layout.hidden);
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
          chart={hidden.has('chart') ? undefined : false}
        />
      ),
      chart: null,
      games: (
        <CollectionGamesPanel
          items={items}
          selected={query.game}
          onSelect={(game) => {
            haptics.selection();
            changeQuery({ game });
          }}
        />
      ),
      top: <CollectionTopCards items={items} onOpen={openItem} />,
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

    widgets = [
      ...layout.order.map(
        (section): BoardWidget =>
          section === 'chart'
            ? {
                key: section,
                label: SECTION_LABEL[section].title,
                stretch: true,
                node: ({ heightScale }) => (
                  <CollectionValueChart
                    items={items}
                    history={meta.valueHistory}
                    onOpen={openItem}
                    chartHeight={Math.round(110 * heightScale)}
                  />
                ),
              }
            : { key: section, label: SECTION_LABEL[section].title, node: sections[section] },
      ),
      {
        key: 'toolbar',
        label: 'Search, sort and views',
        hideable: false,
        node: (
          <CollectionToolbar
            query={query}
            view={view}
            usesBinders={usesBinders}
            shown={visible.length}
            onChange={changeQuery}
            onView={setView}
            onFilters={() => setSheet('filters')}
          />
        ),
      },
    ];

    const header = (
      <View style={styles.header}>
        <ArrangeBoard
          widgets={widgets}
          board={board}
          paused={actionItem !== null || sheet !== null}
          autoScroll={view === 'cover' ? coverScroll.scrollBy : listScroll.scrollBy}
          edges={{ top: insets.top + 80, bottom: tabBarHeight + EDIT_BAR_SPACE }}
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
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg + (board.editing ? EDIT_BAR_SPACE : 0) }]}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          keyboardShouldPersistTaps="handled"
          refreshControl={refresh}
          scrollEnabled={!board.locked}
          ref={(node) => coverScroll.attach(node)}
          onScroll={coverScroll.onScroll}
          onLayout={coverScroll.onLayout}
          onContentSizeChange={coverScroll.onContentSizeChange}
          scrollEventThrottle={16}
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
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + spacing.lg + (board.editing ? EDIT_BAR_SPACE : 0) }]}
          scrollIndicatorInsets={{ bottom: tabBarHeight }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={refresh}
          scrollEnabled={!board.locked}
          ref={(node) => listScroll.attach(node)}
          onScroll={listScroll.onScroll}
          onLayout={listScroll.onLayout}
          onContentSizeChange={listScroll.onContentSizeChange}
          scrollEventThrottle={16}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyText}
        />
      );
    }
  }

  return (
    <Screen title="Collection" action={headerAction}>
      {content}
      {board.editing ? (
        <View style={[styles.editBar, { bottom: tabBarHeight + spacing.sm }]}>
          <BoardControls board={board} widgets={widgets} />
        </View>
      ) : null}
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
  editBar: {
    position: 'absolute',
    zIndex: 50,
    elevation: 50,
    left: spacing.lg,
    right: spacing.lg,
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
    gap: spacing.lg,
  },
  restore: {
    alignSelf: 'center',
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
