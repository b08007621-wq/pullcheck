import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { rowPosition } from '@/components/ListRow';
import { SkeletonRows } from '@/components/SkeletonRows';
import { WishRow } from '@/components/WishRow';
import { useHaptics } from '@/hooks/useHaptics';
import { useTheme } from '@/hooks/useTheme';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useWishlist } from '@/hooks/useWishlist';
import { type AppTheme, spacing, typography } from '@/theme';
import type { WishItem } from '@/types/wishlist';
import { formatRelativeTime } from '@/utils/date';
import { formatMoney } from '@/utils/price';
import { sortWishes, wishStatus } from '@/utils/wishlist';

export default function WishlistScreen() {
  const router = useRouter();
  const theme = useTheme();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { items, meta, isLoaded, refreshing, hits, remove, refresh } = useWishlist();
  const [pulling, setPulling] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh(false);
    }, [refresh]),
  );

  const sorted = useMemo(() => sortWishes(items), [items]);
  const total = useMemo(() => items.reduce((sum, item) => sum + (wishStatus(item).price ?? 0), 0), [items]);

  const openCard = useCallback(
    (wish: WishItem) => {
      haptics.tap();
      router.push({ pathname: '/card/[id]', params: { id: wish.id } });
    },
    [haptics, router],
  );

  const removeWish = useCallback(
    (wish: WishItem) => {
      haptics.remove();
      remove(wish.id);
    },
    [haptics, remove],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<WishItem>) => (
      <WishRow wish={item} position={rowPosition(index, sorted.length)} onPress={openCard} onRemove={removeWish} />
    ),
    [openCard, removeWish, sorted.length],
  );

  const pullToRefresh = useCallback(async () => {
    setPulling(true);
    haptics.tap();
    await refresh(true);
    setPulling(false);
  }, [haptics, refresh]);

  const summary = [
    items.length === 1 ? '1 card' : `${items.length} cards`,
    total > 0 ? formatMoney(total) : null,
    hits > 0 ? `${hits} under target` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          data={isLoaded ? sorted : []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={pulling}
              onRefresh={pullToRefresh}
              tintColor={theme.colors.accent}
              colors={[theme.colors.accent]}
              progressViewOffset={insets.top}
            />
          }
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                Wishlist
              </Text>
              {items.length > 0 ? (
                <Text style={styles.subtitle}>
                  {summary}
                  {refreshing
                    ? ' · updating…'
                    : meta.lastRefreshAt
                      ? ` · checked ${formatRelativeTime(meta.lastRefreshAt)}`
                      : ''}
                </Text>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            isLoaded ? (
              <EmptyState
                icon="heart-outline"
                title="Nothing on your wishlist"
                message="Tap the heart on any card to watch its price. Set a target and it gets flagged when the price drops."
                action={{ label: 'Find a card', icon: 'search', onPress: () => router.navigate('/search') }}
              />
            ) : (
              <SkeletonRows count={4} />
            )
          }
        />
      )}
    />
  );
}

function keyExtractor(wish: WishItem): string {
  return wish.id;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
      flexGrow: 1,
    },
    header: {
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
  });
}
