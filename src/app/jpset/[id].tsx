import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, type ListRenderItemInfo, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DetailLayout } from '@/components/DetailLayout';
import { ErrorState } from '@/components/ErrorState';
import { FadeInView } from '@/components/FadeInView';
import { LoadingState } from '@/components/LoadingState';
import { PressableScale } from '@/components/PressableScale';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useGroupArt } from '@/hooks/useGroupArt';
import { useHaptics } from '@/hooks/useHaptics';
import { useJapaneseLogos } from '@/hooks/useJapaneseLogos';
import { useResource } from '@/hooks/useResource';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { ApiError } from '@/services/http';
import { displaySetName, loadGroupCatalog, loadGroups } from '@/services/tcgcsv';
import { setCode } from '@/services/tcgdex';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { SealedProduct } from '@/types/sealed';
import { formatDate, parseDate } from '@/utils/date';
import { formatMoney } from '@/utils/price';
import { largeProductImage } from '@/utils/sealed';

type Tab = 'cards' | 'sealed';

const TABS: { value: Tab; label: string }[] = [
  { value: 'cards', label: 'Cards' },
  { value: 'sealed', label: 'Sealed' },
];

const COLUMNS = 3;
const GAP = spacing.sm + 2;
const CARD_RATIO = 63 / 88;

export default function JapaneseSetScreen() {
  const router = useRouter();
  const haptics = useHaptics();
  const styles = useThemedStyles(createStyles);
  const { width } = useWindowDimensions();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const groupId = /^\d+$/.test(id) ? Number(id) : null;
  const box = useGroupArt(groupId, 'jp');
  const logos = useJapaneseLogos();
  const [tab, setTab] = useState<Tab>('cards');

  const load = useCallback(async () => {
    const group = (await loadGroups('jp')).find((entry) => entry.groupId === groupId);
    if (!group) throw new ApiError('notFound');
    const catalog = await loadGroupCatalog(group);
    return {
      group,
      cards: [...catalog.singles].sort(byNumber),
      sealed: catalog.sealed,
    };
  }, [groupId]);
  const { data, error, retry } = useResource(`jpset:${id}`, load);

  const tileWidth = Math.floor((Math.min(width, 640) - spacing.lg * 2 - GAP * (COLUMNS - 1)) / COLUMNS);
  const items = useMemo(() => (data ? (tab === 'cards' ? data.cards : data.sealed) : []), [data, tab]);
  const total = useMemo(
    () => (data ? data.cards.reduce((sum, card) => sum + (card.prices?.market ?? 0), 0) : 0),
    [data],
  );

  const open = useCallback(
    (product: SealedProduct) => {
      haptics.tap();
      router.push({
        pathname: '/sealed/[id]',
        params: { id: String(product.productId), groupId: String(product.groupId), market: 'jp' },
      });
    },
    [haptics, router],
  );

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<SealedProduct>) => {
      const price = item.prices?.market ?? item.prices?.mid ?? null;
      const height = tab === 'cards' ? tileWidth / CARD_RATIO : tileWidth;
      return (
        <FadeInView delay={Math.min(index, 12) * 25}>
          <PressableScale
            onPress={() => open(item)}
            accessibilityRole="button"
            accessibilityLabel={item.name}
            style={{ width: tileWidth }}
          >
            <Image
              source={tab === 'cards' ? item.imageUrl : largeProductImage(item.imageUrl)}
              style={{ width: tileWidth, height, borderRadius: radius.sm - 2 }}
              contentFit="contain"
              recyclingKey={String(item.productId)}
              transition={150}
            />
            <Text style={styles.tileText} numberOfLines={1}>
              {item.cardNumber ? `#${item.cardNumber}` : item.name}
            </Text>
            <Text style={styles.tilePrice}>{price ? formatMoney(price, 'USD') : '—'}</Text>
          </PressableScale>
        </FadeInView>
      );
    },
    [open, styles.tilePrice, styles.tileText, tab, tileWidth],
  );

  if (!data) {
    return (
      <DetailLayout centered>
        {error ? (
          <ErrorState title="Couldn’t load this set" message={error.message} onRetry={retry} />
        ) : (
          <LoadingState message="Loading Japanese set…" />
        )}
      </DetailLayout>
    );
  }

  const released = parseDate(data.group.publishedOn);
  const logo = logos[setCode(data.group.abbreviation)] ?? null;

  return (
    <DetailLayout
      renderList={(insets) => (
        <FlatList
          key={tab}
          data={items}
          keyExtractor={(product) => String(product.productId)}
          renderItem={renderItem}
          numColumns={COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
          initialNumToRender={18}
          ListHeaderComponent={
            <View style={styles.header}>
              {logo || box ? (
                <Image
                  source={logo ?? largeProductImage(box ?? '')}
                  style={logo ? styles.logo : styles.art}
                  contentFit="contain"
                  transition={200}
                />
              ) : null}
              <Text style={styles.title} accessibilityRole="header">
                {displaySetName(data.group)}
              </Text>
              <Text style={styles.subtitle}>
                {[
                  data.group.abbreviation,
                  released ? formatDate(released) : null,
                  `${data.cards.length} cards`,
                  total > 0 ? `${formatMoney(total, 'USD')} set value` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <SegmentedControl options={TABS} value={tab} onChange={setTab} />
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>{tab === 'cards' ? 'No cards listed yet.' : 'No sealed products listed.'}</Text>
          }
        />
      )}
    />
  );
}

function byNumber(first: SealedProduct, second: SealedProduct): number {
  const a = Number.parseInt((first.cardNumber ?? '').replace(/^\D+/, ''), 10);
  const b = Number.parseInt((second.cardNumber ?? '').replace(/^\D+/, ''), 10);
  if (Number.isFinite(a) && Number.isFinite(b) && a !== b) return a - b;
  return (first.cardNumber ?? '').localeCompare(second.cardNumber ?? '');
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: spacing.lg,
    },
    header: {
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    art: {
      height: 160,
      width: '100%',
    },
    logo: {
      height: 90,
      width: '100%',
    },
    title: {
      ...typography.title,
      color: theme.colors.text,
    },
    subtitle: {
      ...typography.caption,
      color: theme.colors.textMuted,
    },
    row: {
      gap: GAP,
      marginBottom: spacing.md,
    },
    tileText: {
      ...typography.caption,
      color: theme.colors.textMuted,
      marginTop: 4,
    },
    tilePrice: {
      ...typography.caption,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    empty: {
      ...typography.body,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingVertical: spacing.xl,
    },
  });
}
