import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemedStyles } from '@/hooks/useThemedStyles';
import { type AppTheme, radius, spacing, typography } from '@/theme';
import type { CollectionItem } from '@/types/collection';
import { formatCollectorNumber } from '@/utils/card';
import { entryVersion, versionLabel } from '@/utils/cardVersion';
import { itemPrice, itemProfit, itemTitle } from '@/utils/collectionValue';
import { formatMoney, percentChange } from '@/utils/price';
import { binderLabel, itemBinder } from '@/utils/binder';
import { classifySealed, SEALED_TYPE_LABEL } from '@/utils/sealedType';

import { ListRow, type RowPosition } from './ListRow';
import { PriceChange } from './PriceChange';
import { ProductImage } from './ProductImage';

type Props = {
  item: CollectionItem;
  position: RowPosition;
  onPress: (item: CollectionItem) => void;
};

function CollectionListItemView({ item, position, onPress }: Props) {
  const styles = useThemedStyles(createStyles);
  const price = itemPrice(item);
  const profit = itemProfit(item);
  const change =
    profit?.percent ??
    (price && item.priceAtAdd && price.currency === item.priceAtAdd.currency
      ? percentChange(item.priceAtAdd.amount, price.amount)
      : null);
  const version = item.kind === 'card' ? versionLabel(item.card, entryVersion(item), 'short') : null;
  const binder = itemBinder(item);
  const graded = item.kind === 'card' && item.grading ? `${item.grading.company} ${item.grading.grade}` : null;
  const subtitle = [itemSubtitle(item), graded ?? version, binder === 'personal' ? null : binderLabel(binder)]
    .filter(Boolean)
    .join(' · ');

  return (
    <ListRow position={position} inset={70}>
      <Pressable
        onPress={() => onPress(item)}
        accessibilityRole="button"
        accessibilityLabel={itemTitle(item)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      >
        {item.kind === 'card' ? (
          <Image
            source={item.card.images.small}
            style={styles.cardImage}
            contentFit="contain"
            recyclingKey={item.key}
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View style={styles.productFrame}>
            <ProductImage product={item.product} size={160} style={styles.productImage} transition={150} />
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {itemTitle(item)}
            {item.quantity > 1 ? <Text style={styles.count}>{`  ×${item.quantity}`}</Text> : null}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.value}>
          <Text style={styles.amount}>
            {price ? formatMoney(price.amount * item.quantity, price.currency) : 'No price'}
          </Text>
          {change !== null ? <PriceChange percent={change} prefix={profit ? 'vs paid' : undefined} /> : null}
        </View>
      </Pressable>
    </ListRow>
  );
}

export const CollectionListItem = memo(CollectionListItemView);

function itemSubtitle(item: CollectionItem): string {
  if (item.kind === 'card') return `${item.card.set.name} · #${formatCollectorNumber(item.card)}`;
  const { product } = item;
  const market = product.market === 'jp' ? 'JP · ' : '';
  if (product.cardNumber) return `${market}${product.setName} · #${product.cardNumber}`;
  const type = SEALED_TYPE_LABEL[classifySealed(product.name)];
  const named = product.name.toLowerCase().includes(product.setName.toLowerCase());
  return named || !product.setName ? `${market}${type}` : `${market}${type} · ${product.setName}`;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingLeft: spacing.md,
      paddingRight: spacing.lg,
    },
    pressed: {
      backgroundColor: theme.colors.surfaceRaised,
    },
    cardImage: {
      width: 46,
      height: 64,
      borderRadius: radius.sm - 2,
    },
    productFrame: {
      width: 46,
      height: 64,
      borderRadius: radius.sm - 2,
      padding: 1,
    },
    productImage: {
      flex: 1,
    },
    info: {
      flex: 1,
      gap: 3,
    },
    name: {
      ...typography.label,
      fontSize: 16,
      color: theme.colors.text,
    },
    count: {
      ...typography.caption,
      fontSize: 14,
      color: theme.colors.textMuted,
      fontVariant: ['tabular-nums'],
    },
    subtitle: {
      ...typography.caption,
      fontSize: 13,
      color: theme.colors.textMuted,
    },
    value: {
      alignItems: 'flex-end',
      gap: 3,
    },
    amount: {
      ...typography.label,
      fontSize: 16,
      color: theme.colors.text,
      fontVariant: ['tabular-nums'],
    },
  });
}
