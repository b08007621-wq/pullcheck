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
import type { CollectionItem } from '@/types/collection';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatPrice } from '@/utils/price';

import { PressableScale } from './PressableScale';
import { ProductImage } from './ProductImage';

type Props = {
  items: CollectionItem[];
  bottomInset: number;
  onOpen3d: (item: CollectionItem) => void;
};

const CARD_RATIO = 63 / 88;

export function CollectionCoverflow({ items, bottomInset, onOpen3d }: Props) {
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
    [itemHeight, itemWidth, onOpen3d, scrollX, styles.image],
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
          <Text style={styles.title} numberOfLines={1}>
            {itemTitle(active)}
          </Text>
          <Text style={styles.meta}>
            {[price ? formatPrice(price) : null, active.quantity > 1 ? `×${active.quantity}` : null, `${index + 1} of ${items.length}`]
              .filter(Boolean)
              .join(' · ')}
          </Text>
          <Text style={styles.hint}>Tap to view in 3D</Text>
        </View>
      ) : null}
    </View>
  );
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
