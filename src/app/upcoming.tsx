import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { SectionList, type SectionListData, StyleSheet, Text, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { LoadingState } from '@/components/LoadingState';
import { SealedListItem } from '@/components/SealedListItem';
import { useCollection } from '@/hooks/useCollection';
import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { useUpcoming } from '@/hooks/useUpcoming';
import { sealedKey } from '@/state/collectionContext';
import { type AppTheme, spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { daysUntil, formatDate, parseDate } from '@/utils/date';

type Section = {
  title: string;
  subtitle: string;
  data: SealedProduct[];
};

export default function UpcomingScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { items } = useCollection();
  const { data, error, retry } = useUpcoming();

  const sections = useMemo<Section[]>(
    () =>
      (data ?? [])
        .filter((set) => set.products.length > 0)
        .map((set) => {
          const date = parseDate(set.releasedOn);
          const days = date ? daysUntil(date) : null;
          const when = date ? formatDate(date) : 'Date to be announced';
          const countdown = days === null ? '' : days <= 0 ? ' · Out now' : ` · in ${days} ${days === 1 ? 'day' : 'days'}`;
          return { title: set.name, subtitle: `Releases ${when}${countdown}`, data: set.products };
        }),
    [data],
  );

  const owned = useMemo(() => new Map(items.map((item) => [item.key, item.quantity])), [items]);

  const openProduct = useCallback(
    (product: SealedProduct) => {
      haptics.tap();
      router.push({
        pathname: '/sealed/[id]',
        params: { id: String(product.productId), groupId: String(product.groupId), market: product.market ?? 'en' },
      });
    },
    [haptics, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: SealedProduct }) => (
      <View style={styles.item}>
        <SealedListItem product={item} ownedQuantity={owned.get(sealedKey(item.productId)) ?? 0} onPress={openProduct} />
      </View>
    ),
    [openProduct, owned, styles.item],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<SealedProduct, Section> }) => (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
      </View>
    ),
    [styles.sectionHeader, styles.sectionSubtitle, styles.sectionTitle],
  );

  if (!data) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load upcoming sets" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Finding upcoming sets…" />
        )}
      </DetailLayout>
    );
  }

  return (
    <DetailLayout
      renderList={(insets) => (
        <SectionList
          sections={sections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          ListHeaderComponent={
            <View style={styles.header}>
              <Text style={styles.title} accessibilityRole="header">
                Upcoming sets
              </Text>
              <Text style={styles.subtitle}>Pre-order prices from TCGplayer</Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="Nothing announced yet"
              message="Upcoming sets with pre-order listings will show up here."
            />
          }
        />
      )}
    />
  );
}

function keyExtractor(product: SealedProduct): string {
  return String(product.productId);
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.xs,
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    sectionHeader: {
      paddingTop: spacing.xl,
      paddingBottom: spacing.sm,
      gap: 2,
    },
    sectionTitle: {
      ...typography.heading,
      fontSize: 18,
      color: theme.colors.text,
    },
    sectionSubtitle: {
      ...typography.caption,
      color: theme.colors.accent,
    },
    item: {
      marginBottom: spacing.sm,
    },
  });
}
