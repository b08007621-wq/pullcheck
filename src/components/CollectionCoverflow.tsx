import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import {
  Animated,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useHaptics } from '@/hooks/useHaptics';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, spacing, typography } from '@/theme';
import type { ChangeBasis, CollectionItem } from '@/types/collection';
import { formatCollectorNumber } from '@/utils/card';
import { entryVersion, versionLabel } from '@/utils/cardVersion';
import { CHANGE_CAPTION, itemChange } from '@/utils/collectionChange';
import { isNewItem } from '@/utils/collectionQuery';
import { itemPrice, itemProfit, itemTitle } from '@/utils/collectionValue';
import { formatMoney, formatPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { PriceChange } from './PriceChange';
import { ProductImage } from './ProductImage';

type Props = {
  items: CollectionItem[];
  bottomInset: number;
  basis: ChangeBasis;
  isFresh: (item: CollectionItem) => boolean;
  onOpen3d: (item: CollectionItem) => void;
  onLongPress: (item: CollectionItem) => void;
};

const CARD_RATIO = 63 / 88;

export function CollectionCoverflow({ items, bottomInset, basis, isFresh, onOpen3d, onLongPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const [scrollX] = useState(() => new Animated.Value(0));
  const [index, setIndex] = useState(0);
  const itemWidth = Math.min(width * 0.58, 260);
  const itemHeight = itemWidth / CARD_RATIO;
  const sidePadding = (width - itemWidth) / 2;
  const active = items[Math.min(index, items.length - 1)];
  const price = active ? itemPrice(active) : null;
  const change = active ? itemChange(active, basis) : null;
  const profit = active ? itemProfit(active) : null;

  const onScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
      setIndex((current) => {
        if (current !== next) haptics.selection();
        return next;
      });
    },
    [haptics, itemWidth],
  );

  const renderItem = useCallback(
    ({ item, index: position }: ListRenderItemInfo<CollectionItem>) => {
      const input = [(position - 1) * itemWidth, position * itemWidth, (position + 1) * itemWidth];
      const rotateY = scrollX.interpolate({ inputRange: input, outputRange: ['48deg', '0deg', '-48deg'], extrapolate: 'clamp' });
      const scale = scrollX.interpolate({ inputRange: input, outputRange: [0.78, 1, 0.78], extrapolate: 'clamp' });
      const opacity = scrollX.interpolate({ inputRange: input, outputRange: [0.55, 1, 0.55], extrapolate: 'clamp' });
      return (
        <View style={{ width: itemWidth, height: itemHeight, justifyContent: 'center' }}>
          <Animated.View style={{ opacity, transform: [{ perspective: 900 }, { rotateY }, { scale }] }}>
            <PressableScale
              onPress={() => onOpen3d(item)}
              onLongPress={() => onLongPress(item)}
              delayLongPress={320}
              accessibilityRole="button"
              accessibilityLabel={`Open ${itemTitle(item)} in 3D`}
              style={{ width: itemWidth, height: itemHeight }}
            >
              {item.kind === 'card' ? (
                <Image
                  source={item.card.images.large}
                  placeholder={item.card.images.small}
                  style={styles.image}
                  contentFit="contain"
                  accessibilityIgnoresInvertColors
                />
              ) : (
                <ProductImage product={item.product} size={640} style={styles.image} />
              )}
            </PressableScale>
          </Animated.View>
        </View>
      );
    },
    [itemHeight, itemWidth, onOpen3d, onLongPress, scrollX, styles.image],
  );

  return (
    <View style={styles.root}>
      <Animated.FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={itemWidth}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: sidePadding }}
        style={{ flexGrow: 0, height: itemHeight + spacing.lg }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, position) => ({ length: itemWidth, offset: itemWidth * position, index: position })}
      />
      {active ? (
        <View style={[styles.caption, { paddingBottom: bottomInset + spacing.lg }]}>
          <View style={styles.titleRow}>
            {isFresh(active) || isNewItem(active) ? (
              <View style={styles.newBadge}>
                <Text style={styles.newText}>NEW</Text>
              </View>
            ) : null}
            <Text style={styles.title} numberOfLines={1}>
              {itemTitle(active)}
            </Text>
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {subtitleFor(active)}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{price ? formatPrice(price) : 'No price'}</Text>
            {change && change.percent !== null ? (
              <PriceChange percent={change.percent} prefix={CHANGE_CAPTION[change.basis]} />
            ) : null}
          </View>
          <Text style={styles.meta}>
            {[
              active.quantity > 1 ? `${active.quantity} copies` : null,
              profit ? `${profit.amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(profit.amount), profit.currency)} vs paid` : null,
              `${index + 1} of ${items.length}`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.hint}>Tap for 3D · hold for options</Text>
        </View>
      ) : null}
    </View>
  );
}

function subtitleFor(item: CollectionItem): string {
  if (item.kind === 'sealed') return item.product.setName;
  const version = item.grading ? `${item.grading.company} ${item.grading.grade}` : versionLabel(item.card, entryVersion(item), 'short');
  return [item.card.set.name, `#${formatCollectorNumber(item.card)}`, version].filter(Boolean).join(' · ');
}

function keyExtractor(item: CollectionItem): string {
  return item.key;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'center',
      gap: spacing.lg,
    },
    image: {
      flex: 1,
    },
    caption: {
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.lg,
    },
    title: {
      ...typography.heading,
      color: theme.colors.text,
      flexShrink: 1,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs + 2,
      maxWidth: '100%',
    },
    newBadge: {
      borderRadius: 6,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: theme.colors.gain,
    },
    newText: {
      fontSize: 10,
      fontWeight: '800',
      color: theme.colors.background,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: 2,
    },
    price: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    meta: {
      ...typography.caption,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    hint: {
      ...typography.caption,
      color: theme.colors.textFaint,
    },
  });
}
