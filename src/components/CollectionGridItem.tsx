import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem } from '@/types/collection';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatPrice } from '@/utils/price';

import { FadeInView } from './FadeInView';
import { PressableScale } from './PressableScale';
import { ProductImage } from './ProductImage';

type Props = {
  item: CollectionItem;
  width: number;
  onPress: (item: CollectionItem) => void;
};

const CARD_RATIO = 63 / 88;

function CollectionGridItemView({ item, width, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = itemPrice(item);
  const imageHeight = item.kind === 'card' ? width / CARD_RATIO : width;

  return (
    <FadeInView>
      <PressableScale
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={itemTitle(item)}
        style={[styles.tile, { width }]}
      >
        <View style={{ width, height: imageHeight }}>
          {item.kind === 'card' ? (
            <Image
              source={item.card.images.small}
              style={styles.image}
              contentFit="contain"
              recyclingKey={item.key}
              transition={150}
              accessibilityIgnoresInvertColors
            />
          ) : (
            <ProductImage product={item.product} size={320} style={styles.image} transition={150} />
          )}
          {item.quantity > 1 ? (
            <View style={styles.count}>
              <Text style={styles.countText}>{`×${item.quantity}`}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.price} numberOfLines={1}>
          {price ? formatPrice(price) : '—'}
        </Text>
      </PressableScale>
    </FadeInView>
  );
}

export const CollectionGridItem = memo(CollectionGridItemView);

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tile: {
      gap: spacing.xs,
    },
    image: {
      flex: 1,
    },
    count: {
      position: 'absolute',
      top: 4,
      right: 4,
      borderRadius: radius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      backgroundColor: theme.colors.accent,
    },
    countText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onAccent,
    },
    price: {
      ...typography.caption,
      color: theme.colors.textMuted,
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
  });
}
