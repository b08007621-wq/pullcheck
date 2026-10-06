import { Image } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, typography } from '@/theme';
import type { ChangeBasis, CollectionItem } from '@/types/collection';
import { entryVersion } from '@/utils/cardVersion';
import { itemChange } from '@/utils/collectionChange';
import { isNewItem } from '@/utils/collectionQuery';
import { itemPrice, itemTitle } from '@/utils/collectionValue';
import { formatPrice, variantShortLabel } from '@/utils/price';

import { FadeInView } from './FadeInView';
import { PressableScale } from './PressableScale';
import { PriceChange } from './PriceChange';
import { ProductImage } from './ProductImage';

type Props = {
  item: CollectionItem;
  width: number;
  basis: ChangeBasis;
  details: boolean;
  fresh: boolean;
  onPress: (item: CollectionItem) => void;
  onLongPress: (item: CollectionItem) => void;
};

const CARD_RATIO = 63 / 88;

function CollectionGridItemView({ item, width, basis, details, fresh, onPress, onLongPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = itemPrice(item);
  const change = itemChange(item, basis);
  const imageHeight = item.kind === 'card' ? width / CARD_RATIO : width;
  const tag = tagFor(item);
  const compact = width < 100;

  return (
    <FadeInView>
      <PressableScale
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
        delayLongPress={320}
        accessibilityRole="button"
        accessibilityLabel={itemTitle(item)}
        accessibilityHint="Long press for quick actions"
        style={[styles.tile, { width }]}
      >
        <View style={[styles.frame, { width, height: imageHeight }, fresh && styles.fresh]}>
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
          {fresh || isNewItem(item) ? (
            <View style={[styles.corner, styles.topLeft, styles.newBadge]}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          ) : null}
          {item.quantity > 1 ? (
            <View style={[styles.corner, styles.topRight, styles.count]}>
              <Text style={styles.countText}>{`×${item.quantity}`}</Text>
            </View>
          ) : null}
          {tag ? (
            <View style={[styles.corner, styles.bottomLeft, styles.tag]}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ) : null}
        </View>
        <View style={[styles.meta, compact && styles.metaCompact]}>
          <Text style={styles.price} numberOfLines={1}>
            {price ? formatPrice(price) : '—'}
          </Text>
          {change && change.percent !== null ? <PriceChange percent={change.percent} /> : null}
        </View>
        {details ? (
          <Text style={styles.name} numberOfLines={1}>
            {itemTitle(item)}
          </Text>
        ) : null}
      </PressableScale>
    </FadeInView>
  );
}

export const CollectionGridItem = memo(CollectionGridItemView);

function tagFor(item: CollectionItem): string | null {
  if (item.kind !== 'card') return null;
  if (item.grading) return `${item.grading.company} ${item.grading.grade}`;
  const variant = entryVersion(item).variant;
  if (variant && variant !== 'normal' && variant !== 'holofoil') return variantShortLabel(variant);
  return null;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    tile: {
      gap: 3,
    },
    frame: {
      borderRadius: radius.sm,
    },
    fresh: {
      shadowColor: theme.colors.accent,
      shadowOpacity: 0.9,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 0 },
    },
    image: {
      flex: 1,
    },
    corner: {
      position: 'absolute',
      borderRadius: radius.sm,
      paddingHorizontal: 5,
      paddingVertical: 1,
    },
    topLeft: {
      top: 4,
      left: 4,
    },
    topRight: {
      top: 4,
      right: 4,
    },
    bottomLeft: {
      bottom: 4,
      left: 4,
    },
    newBadge: {
      backgroundColor: theme.colors.gain,
    },
    newText: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 0.4,
      color: theme.colors.background,
    },
    count: {
      backgroundColor: theme.colors.accent,
    },
    countText: {
      ...typography.caption,
      fontSize: 11,
      fontWeight: '700',
      color: theme.colors.onAccent,
    },
    tag: {
      backgroundColor: 'rgba(0,0,0,0.72)',
    },
    tagText: {
      fontSize: 10,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    meta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      columnGap: 6,
      paddingTop: 2,
    },
    metaCompact: {
      flexDirection: 'column',
    },
    price: {
      ...typography.label,
      fontSize: 14,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
    name: {
      ...typography.caption,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
    },
  });
}
